# Deployment guide

This runbook describes the current deployment topology.

> **Before deploying:** Review the P0/P1 findings in
> [Project status](../PROJECT_STATUS.md). The repository currently has an exposed
> credential in Git history, permissive Firebase rules, incomplete product and
> security controls, and production protections that require administrator setup.

## Topology

| Service | Current platform | Current target |
|---|---|---|
| React/Vite frontend | Vercel | `https://drawink.app` |
| Socket.io collaboration server | Google Cloud Run | `drawink-collab`, `us-central1` |
| Functions and structured data | Convex Cloud | project deployment selected by `CONVEX_DEPLOY_KEY`/CLI |
| Encrypted binary assets | Firebase Storage | GCP/Firebase project `drawink-2026` |
| Authentication | Clerk | Clerk application configured for Convex JWTs and webhooks |

The Cloud Run project, region, repository, service, and domain are hard-coded in
`scripts/deploy.ts`. Change the script before reusing this deployment setup for a
different environment.

## Preflight

Required access and tools:

- Bun and Node.js 20.19+;
- Convex CLI access or a production deploy key;
- Clerk dashboard access;
- `gcloud` access to project `drawink-2026`;
- Docker for the current collaboration deploy script;
- Vercel project access;
- Firebase project access;
- DNS control for `drawink.app`.

From a clean commit, run all quality gates and both builds. The same commands are
required by CI before deployment jobs can start.

```bash
bun install --frozen-lockfile
bun run verify
```

Never deploy from a working tree containing unreviewed local environment files.

## 1. Convex

### Configure deployment variables

Convex secrets belong in the deployment environment, not `convex/.env`.

```bash
# Enter values interactively to avoid putting them in shell history.
bunx convex env set --prod CLERK_FRONTEND_API_URL
bunx convex env set --prod CLERK_WEBHOOK_SECRET
bunx convex env set --prod AI_BASE_URL
bunx convex env set --prod AI_API_KEY
bunx convex env set --prod AI_MODEL
```

List names without printing values:

```bash
bunx convex env list --prod --names-only
```

Convex environment variables are deployment-specific. See the official
[environment variable guide](https://docs.convex.dev/production/environment-variables)
and [Convex environment CLI reference](https://docs.convex.dev/cli/reference/env).

### Configure Clerk

1. Create the Convex JWT template expected by the frontend.
2. Set the corresponding Clerk frontend/issuer domain as
   `CLERK_FRONTEND_API_URL` in Convex.
3. Configure a Clerk webhook at
   `https://<convex-deployment>.convex.site/clerk-webhook`.
4. Subscribe to `user.created`, `user.updated`, and `user.deleted`.
5. Store the endpoint signing secret as `CLERK_WEBHOOK_SECRET` in Convex.

### Deploy

```bash
bun run convex:deploy
```

CI uses the `CONVEX_DEPLOY_KEY` secret in the GitHub `Production` environment.

### Verify

```bash
bunx convex logs --prod
bunx convex env list --prod --names-only
```

Verify sign-in, webhook user creation, workspace creation, board save/load, public
share creation, and both AI actions with a non-production test user first.

## 2. Collaboration server on Cloud Run

### Current configuration

| Setting | Value |
|---|---|
| GCP project | `drawink-2026` |
| Region | `us-central1` |
| Artifact Registry repository | `drawink` |
| Cloud Run service | `drawink-collab` |
| Container port | `3003` |
| Expected frontend origin | `https://drawink.app` |
| Intended custom domain | `https://collab.drawink.app` |

The deploy script enables session affinity, a 3,600-second timeout, zero minimum
instances, and a maximum of three instances. Reassess these values against real
WebSocket load and cost before production changes.

### First-time GCP setup

```bash
gcloud config set project drawink-2026
gcloud services enable artifactregistry.googleapis.com run.googleapis.com
gcloud artifacts repositories create drawink \
  --repository-format=docker \
  --location=us-central1 \
  --project=drawink-2026
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### Deploy

```bash
bun ./scripts/deploy.ts
```

CI uses the non-interactive form:

```bash
bun ./scripts/deploy.ts --quick
```

The current script publishes a mutable `latest` tag. A production-safe follow-up
should tag with the commit SHA, record the resulting Cloud Run revision, and
retain a known-good rollback revision.

### Verify

```bash
gcloud run services describe drawink-collab \
  --region=us-central1 \
  --project=drawink-2026

gcloud run services logs read drawink-collab \
  --region=us-central1 \
  --project=drawink-2026 \
  --limit=100
```

Check the generated `run.app` URL's `/` health response and establish a real
Socket.io connection from an allowed frontend origin.

### Custom domain

Custom-domain options and regional support change over time. Follow the official
[Cloud Run custom-domain guide](https://cloud.google.com/run/docs/mapping-custom-domains)
instead of copying a guessed CNAME target, then record the selected approach in
this runbook.

If Cloudflare manages DNS, add the exact records Cloud Run or the load balancer
returns. Disable proxy/interception while certificate validation is pending and
confirm renewal works before enabling any proxy feature. A DNS provider does not
make Cloud Run compute, egress, or load-balancer usage unconditionally free.

## 3. Frontend on Vercel

### Required browser variables

Configure these for the appropriate Vercel environments:

| Variable | Purpose |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk browser key |
| `VITE_CONVEX_URL` | Convex cloud URL |
| `VITE_APP_WS_SERVER_URL` | Socket.io collaboration endpoint |
| `VITE_APP_FIREBASE_CONFIG` | Firebase browser configuration JSON |

Optional integrations include `VITE_SENTRY_DSN`, library backend/URL values,
Drawink Plus URLs/keys, and the documented `VITE_APP_*` feature flags in
`.env.example`.

AI provider keys, Clerk webhook secrets, deploy keys, Stripe secrets, and cloud
credentials must never use the `VITE_` prefix or be stored in Vercel browser
variables.

### Deploy

```bash
vercel link
vercel --prod
```

`vercel.json` builds with `bun run build`, serves `dist`, applies security/cache
headers, and rewrites application routes to `index.html`.

The frontend job in `.github/workflows/deploy.yml` is currently commented out.
Until it is restored and protected, frontend deployment is a separate manual or
Vercel Git-integration operation.

### Verify

- Load `/`, `/sign-in`, `/dashboard`, `/billing`, and a workspace board URL.
- Confirm a direct refresh on nested routes returns the SPA.
- Verify Clerk sign-in and Convex authentication.
- Create/save/reopen a board.
- Start/join a collaboration room in two browsers.
- Upload and reload an image.
- Create and open an encrypted public share.
- Check browser console, Sentry, and network failures.

## 4. Firebase Storage

The current browser client uploads encrypted room/share assets directly to
Firebase Storage. The checked-in rules allow anonymous writes and must not be
treated as production-safe.

After implementing and testing secure rules:

```bash
cd firebase-project
firebase deploy --only storage --project drawink-2026
```

Do not deploy the legacy Firestore rules until their public access has been
removed or Firestore has been deleted from the active configuration.

Add emulator tests for allowed owner/member operations, denied cross-tenant
operations, size/content-type limits, overwrite/delete behavior, and undeclared
paths.

## 5. GitHub Actions behavior

| Workflow | Trigger | Current behavior |
|---|---|---|
| `ci.yml` | Push to `master`, pull requests | Frozen install, Biome, both type-checks, Vitest, and both builds |
| `deploy.yml` | Push to `master`, manual dispatch | Runs the same gates, then deploys Convex and Cloud Run; frontend job disabled |
| `blacksmith-testbox.yml` | Manual dispatch with a testbox ID | Runs commands in an existing remote test environment |

Repository automation now pins Bun, uses frozen installs, and serializes
production deployments. Administrators still need to:

1. Require pull requests and passing type-check/lint/tests on `master`.
2. Add reviewers and branch restrictions to the GitHub `Production` environment.
3. Use path filters and separate deployable service changes.
4. Record deployed commit/revision identifiers.

## Rollback

### Cloud Run

List revisions and route traffic back to a known-good revision:

```bash
gcloud run revisions list \
  --service=drawink-collab \
  --region=us-central1 \
  --project=drawink-2026

gcloud run services update-traffic drawink-collab \
  --to-revisions=<KNOWN_GOOD_REVISION>=100 \
  --region=us-central1 \
  --project=drawink-2026
```

### Frontend

Promote or redeploy the last verified Vercel deployment, then rerun the route and
auth smoke tests.

### Convex

Redeploy the last known-good function commit. Treat schema/data migrations as
forward-compatible operations and create an explicit data backup/repair plan;
code rollback does not automatically reverse data mutations.

## Monitoring and cost controls

- Create billing budgets/alerts for GCP, Firebase, Convex, Vercel, Clerk, and the
  AI provider.
- Monitor Cloud Run instance count, WebSocket errors, latency, and egress.
- Monitor anonymous share creation, Firebase writes, stored bytes, and cleanup.
- Monitor AI request count/cost independently of the application UI counter.
- Route frontend and backend errors to an owned alert channel.

Pricing changes over time and depends on region/usage. Use the official
[Cloud Run pricing page](https://cloud.google.com/run/pricing) and each provider's
calculator rather than assuming a fixed monthly or free-tier cost.

## Release checklist

- [ ] Exposed credentials rotated and history cleanup coordinated
- [ ] Firebase rules hardened and emulator-tested
- [ ] Type-check, lint, tests, and both builds pass
- [ ] Required production environment variable names verified without printing values
- [ ] Database/schema compatibility reviewed and backup plan recorded
- [ ] Cloud Run image tagged with immutable commit identifier
- [ ] Convex deployed and smoke-tested
- [ ] Collaboration revision deployed and WebSocket-tested
- [ ] Frontend deployed and nested routes/auth tested
- [ ] Public share and encrypted file round-trip tested
- [ ] Monitoring, alerts, and rollback owner confirmed
