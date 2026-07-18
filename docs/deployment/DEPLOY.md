# Deployment guide

The production application has three providers: Vercel for the frontend,
Convex for backend/data/realtime/files, and Clerk for identity. A release is not
complete until the Convex deployment and Vercel deployment both match the same
`master` commit.

## Topology

| Component | Provider | Deployment trigger |
| --- | --- | --- |
| React/Vite frontend | Vercel | Git integration on `master` and pull-request previews |
| Functions, schema, realtime, cron | Convex | `.github/workflows/deploy.yml` after quality gates |
| Encrypted file objects | Convex Storage | Managed with the Convex deployment |
| Authentication | Clerk | External configuration; no deploy artifact |

## Required configuration

### GitHub Production environment

| Secret | Purpose |
| --- | --- |
| `CONVEX_DEPLOY_KEY` | Deploy functions and schema to production Convex |

Vercel token/project secrets are needed only if the commented CLI deployment is
re-enabled. The normal configuration relies on the Vercel Git integration.

### Vercel browser variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_CONVEX_URL` | Yes | Production Convex client URL |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk browser key |
| `VITE_APP_GIT_SHA` | Recommended | Release identification |
| `VITE_SENTRY_DSN` | Optional | Browser error reporting |
| `VITE_APP_PLUS_APP` | Optional | Drawink Pro link/integration |

Feature flags and analytics variables are documented in `.env.example` and
`src/core/vite-env.d.ts`. Do not put private credentials in a `VITE_*` value.

After the Convex-only cutover, delete any old realtime-server and object-storage
browser variables from all Vercel environments. They are not read by the code
and retaining them creates configuration ambiguity.

### Convex server variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `CLERK_FRONTEND_API_URL` | Yes for auth | Clerk issuer/frontend API URL |
| `CLERK_WEBHOOK_SECRET` | Yes for user sync | Verify Clerk webhook signatures |
| `AI_BASE_URL` | Yes for AI | Server-side provider base URL |
| `AI_API_KEY` | Yes for AI | Server-side provider credential |
| `AI_MODEL` | Yes for AI | Provider model name |
| `BETA_ENABLED` | Optional | Beta feature gate |

Set values interactively and verify names without printing secrets:

```bash
bunx convex env set NAME --prod
bunx convex env list --names-only --prod
```

## Preflight

1. Confirm the target commit is reviewed and all CI checks pass.
2. Confirm `package.json` and `bun.lock` agree with Bun 1.3.14.
3. Confirm the Production environment contains `CONVEX_DEPLOY_KEY`.
4. Confirm the Convex schema change is backward-compatible with currently
   deployed browser clients.
5. For data migrations, take an export/snapshot and complete the migration
   verification before removing old fields.
6. Confirm Vercel points at the intended repository and `master` branch.

## Release flow

### 1. Validate

CI runs the same consolidated gate used by maintainers:

```bash
bun install --frozen-lockfile
bun run verify
```

`verify` performs dependency audit, Biome, TypeScript, Vitest, and the production
Vite build.

### 2. Deploy Convex

On a push to `master`, `deploy.yml` repeats the quality gates and then runs:

```bash
bun run convex:deploy
```

The deploy key selects the production deployment. Do not set a development
`CONVEX_DEPLOYMENT` value in the production job.

### 3. Deploy Vercel

The Vercel Git integration builds the same `master` commit with:

```bash
bun install --frozen-lockfile
bun run build
```

`vercel.json` declares `dist` as the output directory and provides the SPA
rewrite to `index.html`. Preview deployments use the pull-request commit and
must never receive production-only secrets unless explicitly required.

## Verification

### Backend

- The GitHub deployment workflow is green.
- Convex functions, schema, indexes, and cron jobs show the new deployment.
- Function logs contain no validator, auth, or scheduled-cleanup errors.
- Clerk sign-in can list/create a workspace and save/reload an encrypted board.

### Frontend

- The Vercel deployment source SHA matches the intended commit.
- `/`, `/workspace/:workspaceId/board/:boardId`, and refresh/deep links return
  the SPA rather than 404.
- Browser console/network logs contain no requests to retired providers.
- Anonymous local drawing and reload work.
- A public share with an image opens in a private window.
- Two private windows can join one collaboration link, exchange edits/cursors,
  reload, and recover the persisted scene and images.

### Retention

- Realtime messages disappear after their TTL.
- Stale sessions disappear after heartbeat expiry and cleanup.
- A test share/room with an artificially expired timestamp is removed together
  with its scoped file metadata/object.

## Rollback

### Frontend

Promote the last known-good Vercel deployment. A frontend rollback is safe only
if that client is compatible with the currently deployed Convex schema.

### Convex

Deploy the last known-good function commit only when its schema accepts all
documents written by the newer version. For non-additive schema changes:

1. deploy compatibility code;
2. migrate/verify data;
3. deploy the narrowed schema in a later release.

Do not delete newly written data to make an older schema pass. Restore from a
verified export if a data rollback is required.

## Monitoring and cost controls

- Alert on repeated Convex function failures, bandwidth/storage growth, and
  unusually high anonymous share or relay writes.
- Review Convex usage after collaboration-heavy releases.
- Keep room/share expiry and storage-object cleanup enabled.
- Keep Vercel preview retention and log retention bounded.
- Review Clerk and AI-provider usage separately; those costs are outside Convex.

## Legacy provider retirement

The old cloud project must remain available only until its data is copied and
the Convex-only frontend is live. Follow
[GOOGLE_CLOUD_RETIREMENT.md](./GOOGLE_CLOUD_RETIREMENT.md) for the gated
migration, environment/DNS cleanup, project deletion, and recovery window.

## Release checklist

- [ ] `bun run verify` passes in CI/Testbox
- [ ] Convex deploy job passes
- [ ] Vercel deployment matches the same commit
- [ ] Authenticated board save/reload passes
- [ ] Public share scene and image pass in a private window
- [ ] Two-client collaboration and reconnect pass
- [ ] No browser requests target retired services
- [ ] Logs and usage show no new errors or abnormal growth
