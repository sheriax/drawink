# Architecture

Drawink is a local-first React application with a managed Convex backend. Scene
content and uploaded share/collaboration files are encrypted in the browser
before they leave the device. Collaboration and public-share secrets are random
fragment keys; authenticated personal-board storage currently uses a
deterministic user-ID-derived key and therefore has a weaker trust model.

## Runtime topology

```text
Browser
  ├─ React 19 + Vite editor
  ├─ IndexedDB/localStorage       local-first boards and files
  ├─ Clerk                       identity and session tokens
  └─ Convex client
       ├─ tables/functions       workspaces, boards, encrypted scenes
       ├─ reactive queries       encrypted realtime relay and presence
       ├─ Storage                encrypted room/share files
       └─ cron jobs              relay and expired-content cleanup

Hosting
  ├─ Vercel                      static frontend and preview deployments
  ├─ Convex                      backend runtime, data, realtime, and files
  └─ Clerk                       authentication
```

There is no application-owned WebSocket process. `ConvexRealtimeClient` keeps
the editor's existing event-oriented collaboration interface while translating
join, publish, presence, and subscription operations into Convex functions.

## Ownership boundaries

| Concern | Owner | Primary code |
| --- | --- | --- |
| Canvas and editor state | Browser | `src/core`, `src/App.tsx` |
| Local anonymous persistence | Browser IndexedDB/localStorage | `src/data/LocalStorageAdapter.ts` |
| Authenticated board metadata/content | Convex | `convex/workspaces.ts`, `convex/boards.ts` |
| Identity | Clerk | `src/auth`, `convex/auth.config.ts`, `convex/users.ts` |
| Collaborative room snapshot | Convex | `convex/collaboration.ts` |
| Realtime encrypted relay/presence | Convex | `convex/realtime.ts`, `src/data/ConvexRealtimeClient.ts` |
| Public-share metadata/payload | Convex | `convex/publicShares.ts` |
| Encrypted room/share files | Convex Storage | `convex/files.ts`, `src/data/convexFiles.ts` |
| Retention | Convex cron jobs | `convex/crons.ts`, `convex/cleanup.ts` |
| Frontend delivery | Vercel | `vercel.json`, `vite.config.ts` |

## Trust and encryption model

- Collaboration and share keys stay in the URL fragment and are not sent to
  the server.
- Scene updates and binary assets are encrypted in the browser.
- The browser derives a one-way SHA-256 access proof scoped to the room or
  share. Convex receives the proof, not the encryption key.
- Realtime sessions bind that proof to a random client session ID. Messages
  contain ciphertext plus routing metadata and expire quickly.
- Convex Storage download URLs are bearer URLs, but the stored bytes remain
  encrypted and require the fragment key to decode.
- Clerk identity is mandatory for personal workspace/board cloud sync. Link
  collaboration and public shares intentionally support anonymous recipients.

Migration compatibility is deliberately narrower than the normal model:
legacy links omit an access proof until a new client claims them. Their IDs and
ciphertext remain high-entropy, but they should be treated as compatibility
records rather than newly issued links.

## Data flows

### Authenticated board sync

1. The browser saves immediately to local storage.
2. Clerk supplies a Convex JWT for signed-in users.
3. `HybridStorageAdapter` encrypts board content and writes metadata/content to
   Convex.
4. Reactive Convex data and conflict metadata keep devices synchronized.
5. Browser-local image files remain local for ordinary personal boards; files
   copied into public shares or collaboration rooms use Convex Storage.

### Realtime collaboration

1. The room creator generates a random room ID and fragment-only encryption key.
2. The client derives a scoped access proof and joins through
   `ConvexRealtimeClient`.
3. Cursor, presence, follow, and scene events are encrypted and inserted as
   short-lived relay messages.
4. Other room clients receive updates through a reactive query subscription and
   decrypt locally.
5. Periodic encrypted room snapshots provide reconnect/fallback state.
6. Cron jobs remove relay messages, stale sessions, and expired room content.

### Public share

1. The browser generates a fresh key and encrypts/compresses the scene.
2. Convex stores the encrypted share payload and scoped access proof.
3. Referenced images are encrypted separately and uploaded to Convex Storage.
4. The share URL contains the Convex record ID and key in the fragment.
5. The recipient derives the same proof, downloads ciphertext, and decrypts in
   the browser.

## Retention and limits

| Data | Current policy |
| --- | --- |
| Volatile realtime messages | 30 seconds |
| Other realtime messages | 2 minutes |
| Inactive presence sessions | removed within roughly 2 minutes |
| New collaboration room snapshots | 30 days since last save |
| New public shares | 30 days |
| Migrated legacy links | retained without automatic expiry |

Realtime messages are limited to 700 KiB and public-share payloads to 900 KiB
to stay below Convex document and response limits. Encrypted images use Convex
Storage rather than database documents.

## Repository structure

```text
convex/                   schema, functions, realtime relay, cleanup
src/collab/               collaboration controller and portal
src/data/                 persistence, Convex clients, encryption adapters
src/core/                 editor package and UI primitives
src/pages/                application routes
docs/                     maintained architecture and operations docs
.github/workflows/        CI and Convex deployment automation
scripts/                  maintenance and one-time retirement tooling
```

## Architectural rules

1. Convex is the only remote application datastore and file store.
2. Do not add a second realtime server for editor events.
3. Encryption keys must remain client-side and fragment-only.
4. Every public Convex function needs validators, bounded input, and explicit
   access behavior.
5. Every stored object needs an owner/scope and a deletion path.
6. Schema changes that affect existing data use additive, idempotent migrations
   before fields are removed.
