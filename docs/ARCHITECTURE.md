# Architecture

This document describes the architecture on the `master` branch. The archived
[complete revamp plan](./archive/complete-revamp-plan.md) describes a different,
unimplemented monorepo proposal.

## Runtime topology

```text
Browser (React 19 + Vite)
  ├─ Clerk                     authentication and JWTs
  ├─ Convex                    users, workspaces, boards, encrypted board data,
  │                            public shares, AI actions, and usage metadata
  ├─ Socket.io collab server   transient room presence and encrypted broadcasts
  └─ Firebase Storage          encrypted binary assets for rooms and share links

Deployments
  ├─ Frontend                  Vercel
  ├─ Convex functions/data     Convex Cloud
  ├─ Collab server             Google Cloud Run
  └─ Binary storage            Firebase Storage
```

The collaboration server relays encrypted payloads and does not persist scenes.
Convex holds structured records and encrypted scene payloads. Firebase Storage
holds binary drawing assets.

## Main components

| Component | Location | Responsibility |
|---|---|---|
| Application shell | `src/` | Routing, authentication, dashboard, persistence adapters, sharing, and collaboration integration |
| Editor core | `src/core/` | Canvas editor, rendering, actions, import/export, localization, and most existing tests |
| Shared editor libraries | `src/lib/` | Math, element, common, utility, storage, and application types |
| Convex backend | `convex/` | Schema, authorization, queries, mutations, HTTP actions, and AI actions |
| Collaboration server | `server/` | Socket.io rooms, presence, encrypted broadcast relay, and per-socket rate limiting |
| Deployment tooling | `scripts/deploy.ts`, `.github/workflows/` | Cloud Run deployment and GitHub Actions pipelines |
| Firebase configuration | `firebase-project/` | Storage and legacy Firestore rules |
| Examples | `examples/` | Integration examples; see each example's README for its current support status |

This is a single application repository, not the Turborepo layout proposed in
the archived plan. `config/` is a small standalone configuration package, but
the root workspace does not currently define a multi-package build graph.

## Authentication flow

1. `ClerkProvider` is mounted in `src/index.tsx`.
2. `ConvexProviderWithClerk` obtains a Clerk token for Convex.
3. Convex validates the token using `convex/auth.config.ts`.
4. Clerk webhook events are verified in `convex/http.ts` and synchronized into
   the `users` table.
5. Convex functions enforce access using the authenticated Clerk subject.

Authentication-specific UI must stay in the application shell. The reusable
editor core should not call Clerk hooks directly; doing so currently breaks
standalone editor rendering and the legacy editor test harness. This boundary is
tracked in [Project status](./PROJECT_STATUS.md).

## Board persistence flow

Authenticated board persistence uses the hybrid storage adapter in `src/data/`:

1. Local editor state remains usable while offline.
2. The adapter obtains a Clerk/Convex token after sign-in.
3. Board metadata and encrypted content are saved through `convex/boards.ts`.
4. Binary assets used by collaboration and public shares are uploaded to
   Firebase Storage.
5. Socket.io handles low-latency transient broadcasts between room members.

The backend stores ciphertext and IVs for protected content. Encryption keys are
kept in URL fragments or client state and must never be sent to logs, analytics,
or server-side metadata.

## Public share flow

1. The browser serializes and encrypts a scene.
2. `publicShares.createPublicShare` stores the encrypted payload in Convex.
3. Related encrypted files are uploaded to Firebase Storage.
4. The share ID and decryption key are placed in the URL fragment.

Public-share creation and reads are intentionally anonymous. They still require
server-side abuse protection, storage cleanup, and hardened Firebase rules; the
current gaps are listed in [Project status](./PROJECT_STATUS.md).

## AI flow

AI calls run in Convex Node actions (`convex/ai.ts`), keeping provider keys out
of browser bundles. The frontend invokes text-to-diagram and diagram-to-code
actions. Usage is recorded in `convex/aiUsage.ts`.

The usage limit query exists, but the actions do not currently enforce it before
calling the provider. Treat this as an incomplete cost-control boundary.

## Architectural boundaries

- `src/core/` should remain framework- and product-auth-agnostic.
- Only Convex functions may make authorization decisions for persisted data;
  frontend feature gates are presentation only.
- Secrets belong in deployment environment stores, never tracked `.env` files.
- Firebase is for binary assets only. Firestore is legacy and should remain
  undeployed unless its rules are hardened.
- Socket.io transports ephemeral encrypted collaboration events; durable state
  belongs in Convex/Firebase.
- Deployment configuration should use immutable image identifiers and separate
  staging/production settings instead of hard-coded mutable `latest` tags.

## Decision records to add

The repository does not yet maintain architecture decision records. The first
useful records would cover:

1. Convex as the system of record and Firebase Storage as the binary store.
2. Clerk identity mapping and the reusable-editor authentication boundary.
3. Socket.io versus Convex responsibilities for collaboration.
4. Anonymous encrypted public shares and their retention/abuse policy.
5. Whether publishing `@drawink/drawink` remains a supported product surface.
