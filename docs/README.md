# Drawink documentation

This directory is the operational source of truth for the hosted Drawink app.
Code behavior wins if a document and the implementation disagree; update the
relevant document in the same pull request as the code change.

## Start here

| Document | Purpose |
| --- | --- |
| [Architecture](./ARCHITECTURE.md) | Runtime topology, trust boundaries, data flows, retention, and repository map |
| [Development](./DEVELOPMENT.md) | Local setup, environment variables, commands, checks, and troubleshooting |
| [Deployment](./deployment/DEPLOY.md) | Convex and Vercel release, verification, rollback, and cost controls |
| [Cloud retirement](./deployment/GOOGLE_CLOUD_RETIREMENT.md) | One-time data migration and safe deletion of the legacy cloud project |
| [Project status](./PROJECT_STATUS.md) | Completed work, known limitations, and prioritized improvements |

## Component references

| Area | Location |
| --- | --- |
| Convex schema and functions | [`../convex`](../convex) |
| Realtime browser adapter | [`../src/data/ConvexRealtimeClient.ts`](../src/data/ConvexRealtimeClient.ts) |
| Encrypted file browser adapter | [`../src/data/convexFiles.ts`](../src/data/convexFiles.ts) |
| Clerk and cloud-sync adapters | [`../src/data`](../src/data) |
| GitHub Actions | [`../.github/workflows`](../.github/workflows) |

There is no standalone collaboration server or second object-storage backend.
Convex provides the database, reactive subscriptions, scheduled functions, and
file storage used by the application.

## Historical planning

[`archive/complete-revamp-plan.md`](./archive/complete-revamp-plan.md) is retained
for decision history only. It predates the Convex-only backend and must not be
used as a current deployment guide.

## Documentation checklist

When changing behavior, update:

1. `README.md` for user-facing setup or architecture changes.
2. `ARCHITECTURE.md` for boundaries, ownership, or data-flow changes.
3. `DEVELOPMENT.md` for commands, variables, and local tooling.
4. `deployment/DEPLOY.md` for production or rollback changes.
5. `PROJECT_STATUS.md` when a limitation is added or resolved.
