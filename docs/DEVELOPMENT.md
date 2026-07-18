# Development guide

## Prerequisites

- Node.js 20.19+ or 22.12+
- Bun 1.3.14+
- A Convex project
- A Clerk application when testing authenticated cloud sync

Anonymous local drawing works without Clerk. Collaboration, public shares, and
remote persistence require a reachable Convex development deployment.

## Install and run

```bash
git clone https://github.com/sheriax/drawink.git
cd drawink
bun install --frozen-lockfile
cp .env.example .env.local
bun run dev
```

`bun run dev` starts `convex dev` and Vite together. The frontend defaults to
<http://localhost:5173>. There is no separate collaboration server.

Use individual processes when diagnosing startup:

```bash
bun run dev:convex
bun run dev:vite
```

## Browser environment

Only `VITE_*` values are bundled into browser code. Minimum hosted setup:

```bash
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Start from `.env.example` for optional feature flags and external integrations.
Do not add private API keys to a `VITE_*` variable.

No realtime-server URL or second object-storage configuration is used. If an
old local environment still contains those variables, remove them after moving
to this branch; the application no longer reads them.

## Convex environment

Configure server-only values in Convex, not `.env.local`:

```bash
# Omit the value to enter it interactively and keep it out of shell history.
bunx convex env set CLERK_FRONTEND_API_URL
bunx convex env set CLERK_WEBHOOK_SECRET
bunx convex env set AI_BASE_URL
bunx convex env set AI_API_KEY
bunx convex env set AI_MODEL
```

Use `--prod` only when changing the production deployment. `BETA_ENABLED` is
optional. Billing variables should not be added until the server-side billing
flow in `PROJECT_STATUS.md` is implemented.

## Clerk setup

1. Create or select the Clerk application.
2. Add a Convex JWT template named `convex` with the expected audience.
3. Set the frontend publishable key in `.env.local`.
4. Set Clerk server variables in the matching Convex deployment.
5. Point the Clerk webhook at the Convex HTTP endpoint and subscribe only to
   events handled by `convex/http.ts`.
6. Test sign-in, sign-out, workspace creation, and a second-device sync.

Never trust a client-supplied user ID. Convex functions must derive authenticated
identity from `ctx.auth.getUserIdentity()`.

## Common commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start Convex and Vite |
| `bun run build` | Create the production frontend build |
| `bun run preview` | Serve the built frontend locally |
| `bun run lint` | Run Biome without writing changes |
| `bun run lint:fix` | Apply Biome-safe fixes and formatting |
| `bun run typecheck` | Run TypeScript without emitting files |
| `bun run test` | Run the Vitest suite once |
| `bun run test:coverage` | Produce coverage output |
| `bun run audit` | Audit the dependency graph |
| `bun run check` | Lint, type-check, and test |
| `bun run verify` | Audit, check, and production-build |
| `bun run convex:deploy` | Deploy functions/schema to production |

CI runs from the pinned Bun version and frozen lockfile. A dependency change is
complete only when both `package.json` and `bun.lock` are updated.

## Change guidelines

### Convex functions

- Define argument and return validators.
- Use indexes instead of filtering full tables when an index can represent the
  lookup.
- Authenticate personal workspace/board functions and check resource access.
- Bound anonymous payload size and retention.
- Keep administrative and migration functions internal.
- Make schema transitions additive until production data is migrated.

### Realtime collaboration

- Preserve end-to-end encryption; only ciphertext and routing metadata may be
  relayed.
- Keep the browser event contract in `Portal` compatible with
  `ConvexRealtimeClient`.
- Update retention and payload-limit docs when constants change.
- Cover join, leave, publish, subscription, reconnect, and unauthorized-access
  behavior when changing the relay.

### File storage

- Upload encrypted bytes only.
- Register each storage ID with a room/share scope.
- Delete replaced objects and clean up failed uploads when possible.
- Add a deletion path before introducing a new file scope.

## One-time cloud retirement tool

`scripts/migrate-google-cloud-to-convex.ts` exists only for the documented
legacy cutover. Normal development must not call it. It requires authenticated
production credentials and must run in the Blacksmith Testbox as described in
the [retirement runbook](./deployment/GOOGLE_CLOUD_RETIREMENT.md).

## Troubleshooting

### Frozen install reports a changed lockfile

Use the pinned Bun version, update dependencies intentionally, regenerate
`bun.lock`, and commit both files. Do not bypass `--frozen-lockfile` in CI.

### Convex URL is missing

Run `bunx convex dev` once or set `VITE_CONVEX_URL` in `.env.local`. Confirm it
points to the same development deployment whose functions are running.

### Convex authentication is empty

Check the Clerk JWT template name/audience, Convex auth configuration, and the
server-side Clerk URL. Sign out and in again after changing templates.

### Collaboration connects but receives no updates

Confirm both clients use the exact same room link, including the fragment key.
Inspect Convex function logs for access-proof, session, rate-limit, or payload-
size failures. A key mismatch intentionally appears as access denied or decrypt
failure.

### Shared images do not load

Confirm the scene contains initialized image file IDs and that matching `files`
metadata exists for the same room/share scope. The storage object itself is
encrypted, so downloading it directly should not produce a readable image.

### AI reports that it is not configured

Set `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` in the active Convex deployment.
Never place the provider secret in a browser variable.
