# Drawink documentation

This directory is the source of truth for developing, operating, and assessing
the current `master` branch.

## Start here

| Document | Use it for |
|---|---|
| [Development guide](./DEVELOPMENT.md) | Local setup, environment variables, service startup, scripts, and troubleshooting |
| [Architecture](./ARCHITECTURE.md) | Current runtime topology, component ownership, data flows, and system boundaries |
| [Deployment guide](./deployment/DEPLOY.md) | Convex, Cloud Run, Vercel, Firebase, DNS, verification, and rollback operations |
| [Project status](./PROJECT_STATUS.md) | Prioritized security, quality, product-completeness, and maintainability findings |

## Component documentation

| Document | Scope |
|---|---|
| [Collaboration server](../server/README.md) | Socket.io protocol, server configuration, and Cloud Run target |
| [Editor core](../src/core/README.md) | Embedding the Drawink editor component |
| [Localization](../src/core/locales/README.md) | Translation ownership and completion data |
| [Editor changelog](../src/core/CHANGELOG.md) | Historical editor/library releases |
| [Next.js example](../examples/with-nextjs/README.md) | Legacy example status and prerequisites for restoring it |

## Historical planning

[The complete revamp plan](./archive/complete-revamp-plan.md) is retained for
context only. It proposes a Turborepo layout with `apps/` and `packages/` that is
not present on the current branch. It must not be used as current setup or
deployment guidance.

## Documentation ownership

Update documentation in the same change when you modify:

- required environment variables;
- service boundaries, persistence, or authentication flows;
- local commands or supported runtime versions;
- deployment platforms, domains, regions, or CI behavior;
- feature status or known operational limitations.

Do not add secrets, live credentials, copied environment exports, or private
account details to documentation. Link to provider dashboards and describe
where a value comes from without committing the value itself.

## Scope note

Agent skill documentation under `.agents/` is tooling metadata and is not part
of the product documentation set. The architecture and status guides audit its
repository impact where relevant, but the product docs do not duplicate those
instructions.

Last reviewed: **2026-07-17**
