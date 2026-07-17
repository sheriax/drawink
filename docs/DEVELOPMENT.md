# Development guide

## Prerequisites

- Node.js 20.19+ or 22.12+ (required by the installed Vite generation)
- Bun 1.3.14+
- A Convex project
- A Clerk application with a Convex JWT template
- A Firebase project when testing binary uploads

The root package manager is pinned in `package.json` and `bun.lock`. The
collaboration server keeps a separate frozen lock because its Docker build uses
`server/` as the build context.

## Install

```bash
git clone https://github.com/sheriax/drawink.git
cd drawink
bun install --frozen-lockfile
cd server && bun install --frozen-lockfile && cd ..
```

Do not commit generated local environment files or provider credentials.

## Client environment

Copy the public/client template:

```bash
cp .env.example .env.local
```

At minimum, configure:

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_APP_WS_SERVER_URL=http://localhost:3003
VITE_APP_FIREBASE_CONFIG='{"apiKey":"...","projectId":"...","storageBucket":"..."}'
```

Only `VITE_*` values are available to browser code. They are public by design;
never place secret keys in a `VITE_*` variable.

## Convex environment

Convex function secrets are deployment environment variables. Set them through
the Convex dashboard or CLI, not in a tracked `convex/.env` file.

```bash
# Omit the value to enter it interactively and keep it out of shell history.
bunx convex env set CLERK_FRONTEND_API_URL
bunx convex env set CLERK_WEBHOOK_SECRET
bunx convex env set AI_BASE_URL
bunx convex env set AI_API_KEY
bunx convex env set AI_MODEL
```

Use `--prod` for the production deployment:

```bash
bunx convex env set --prod AI_API_KEY
```

`BETA_ENABLED` is optional and controls the default beta flag assigned by the
Clerk user-sync mutation.

## Clerk setup

1. Create the Clerk application.
2. Create the Convex JWT template expected by the app.
3. Set the Clerk frontend/issuer domain in the Convex environment as
   `CLERK_FRONTEND_API_URL`.
4. Add a Clerk webhook pointing to
   `https://<deployment>.convex.site/clerk-webhook`.
5. Subscribe to `user.created`, `user.updated`, and `user.deleted`.
6. Set the signing secret as `CLERK_WEBHOOK_SECRET` in the matching Convex
   deployment.

## Collaboration server environment

The committed server environment files currently contain non-secret defaults.
For local overrides, use an ignored local file or exported process variables.
The server reads these keys:

```dotenv
PORT=3003
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

## Run locally

The convenience command starts Convex, the Socket.io server, and Vite:

```bash
bun run dev
```

Run services separately when debugging startup or environment issues:

```bash
# Terminal 1
bun run dev:convex

# Terminal 2
bun run dev:collab

# Terminal 3
bun run dev:vite
```

The frontend is served at `http://localhost:5173`; the collaboration server
defaults to `http://localhost:3003`.

## Scripts

| Command | Purpose |
|---|---|
| `bun run dev` | Start Convex, collaboration server, and Vite |
| `bun run dev:vite` | Start only the frontend |
| `bun run dev:convex` | Start only Convex development |
| `bun run dev:collab` | Start only the Socket.io server |
| `bun run build` | Build the frontend |
| `bun run build:collab` | Build the collaboration server |
| `bun run preview` | Preview the frontend production build |
| `bun run typecheck` | Run TypeScript without emitting |
| `bun run typecheck:collab` | Type-check the collaboration server |
| `bun run lint` | Run Biome checks |
| `bun run test` | Run Vitest once |
| `bun run test:coverage` | Run Vitest with coverage |
| `bun run audit` | Audit root and collaboration-server lockfiles |
| `bun run check` | Run lint, both type-checks, and Vitest |
| `bun run verify` | Run dependency audits, all quality gates, and both production builds |
| `bun run convex:deploy` | Deploy Convex functions/schema |

## Quality status

The audit branch is clean across both dependency audits, Biome,
frontend/Convex TypeScript, collaboration-server TypeScript, all 53 Vitest
files, and both production builds. GitHub's `Drawink CI` workflow enforces
those gates on pull requests and `master`.

See [Project status](./PROJECT_STATUS.md) for the current counts, root causes,
and recommended repair order.

## Adding or changing code

- Keep product-specific auth/dashboard code in `src/`, outside `src/core/`.
- Add Convex validators and authorization checks to every public function.
- Add tests for application features under `src/tests/` and backend behavior in
  a dedicated Convex/server test layer.
- Keep generated files, local outputs, backups, and secrets out of Git.
- Update this guide, [Architecture](./ARCHITECTURE.md), and
  [Deployment](./deployment/DEPLOY.md) when runtime behavior changes.

## Troubleshooting

### `bun install --frozen-lockfile` reports a changed lockfile

Use Bun 1.3.14 or newer. If dependencies intentionally changed, regenerate the
lock with the pinned Bun version and include the reviewed `bun.lock` diff.

### Convex authentication is empty

Verify the Clerk JWT template, `CLERK_FRONTEND_API_URL`, the frontend
`VITE_CONVEX_URL`, and that the Clerk webhook has created the user record.

### AI reports that it is not configured

Check the Convex deployment variables with `bunx convex env list --names-only`.
Do not create or commit a populated `convex/.env` file.

### Collaboration works without images

Check the Firebase browser configuration and Storage rules. The current rules
need security hardening before production use; see the P0 findings in the status
document.
