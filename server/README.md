# Drawink Collab Server

Real-time collaboration server for [Drawink](https://drawink.app) — powered by **Socket.io** and **Bun**.

## What It Does

Handles real-time collaboration features that need low-latency WebSocket connections:

- **Room-based collaboration** — users join shared rooms to co-edit
- **Encrypted scene sync** — scene updates are encrypted client-side before transmission
- **Cursor & selection presence** — live cursor tracking across collaborators
- **User following** — sync viewports between users
- **Volatile broadcasts** — ephemeral updates (cursors) that don't need guaranteed delivery

> Structured persistent data lives in **Convex**, while encrypted binary assets
> use **Firebase Storage**. This server only handles real-time transport.

## Architecture

```
┌──────────────┐    WebSocket     ┌─────────────────┐
│  Drawink App │ ◄──────────────► │  Collab Server   │
│  (Vite/React)│    Socket.io     │  (Bun + Express) │
└──────┬───────┘                  └──────────────────┘
       │
       │  HTTPS
       ▼
┌──────────────┐
│    Convex    │  Persistence, Auth, Business Logic
└──────────────┘
```

## Development

```bash
# Install dependencies
bun install --frozen-lockfile

# Start with hot reload
bun run dev

# Or start directly
bun run start
```

The server runs on `http://localhost:3003` by default.

> **Tip:** From the root project, `bun run dev` starts Convex, the Vite app, and
> this collaboration server concurrently.

## Environment Variables

| Variable | Dev Default | Production | Description |
|---|---|---|---|
| `PORT` | `3003` | `3003` | Server port |
| `NODE_ENV` | `development` | `production` | Environment |
| `CORS_ORIGIN` | `http://localhost:5173` | `https://drawink.app` | Allowed frontend origin |

The server reads `.env.development` in development and `.env.production`
otherwise, with process variables taking precedence. The committed files must
contain non-secret defaults only.

## Deployment

### Current: Google Cloud Run

The server is deployed on **Google Cloud Run** in the `drawink-2026` GCP project:

- **Region:** `us-central1` (Iowa) - Required for Cloudflare custom domains
- **Service Name:** `drawink-collab`
- **Image:** `us-central1-docker.pkg.dev/drawink-2026/drawink/drawink-collab:latest`
- **URL:** `https://drawink-collab-731425062456.us-central1.run.app`

#### Deploy Steps

We highly recommend using our automated deployment script from the project root. It correctly configures Docker tagging, Artifact Registry push, session affinity, and timeouts for robust WebSocket connections on Cloud Run.

```bash
# From the project root:
bun ./scripts/deploy.ts
```

> **Note:** The intended custom domain is `collab.drawink.app`. Follow the
> repository [deployment guide](../docs/deployment/DEPLOY.md) and the current
> Cloud Run domain-mapping guidance; do not infer a DNS target from this README.

## Socket.io Protocol

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join-room` | `roomID` | Join a collaboration room |
| `server-broadcast` | `roomID, encryptedData, iv` | Broadcast scene update (reliable) |
| `server-volatile-broadcast` | `roomID, encryptedData, iv` | Broadcast volatile update (cursor position) |
| `user-follow` | `{ userToFollow, action }` | Follow/unfollow a user's viewport |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `init-room` | — | Room initialization |
| `first-in-room` | — | You're the first user in this room |
| `new-user` | `socketId` | Another user joined |
| `client-broadcast` | `encryptedData, iv` | Scene update from another user |
| `room-user-change` | `socketId[]` | Room participant list changed |
| `user-follow-room-change` | `socketId[]` | Follower list changed |
| `broadcast-unfollow` | — | All followers have left |

## Security

Scene payloads are **end-to-end encrypted** — the server relays opaque encrypted
blobs and does not need a scene decryption key.

The endpoint is intentionally reachable without application authentication.
Current safeguards validate room IDs, cap individual Socket.io messages at 5 MB,
and limit each socket to 60 handled messages per second. Per-socket limiting does
not prevent connection-churn or distributed abuse, so production still needs
edge-level connection/rate controls, monitoring, and resource budgets.

The server does not persist room state. Clients must recover durable state from
Convex/Firebase as appropriate.

## Verification status

`bun run build` is exercised by the repository build workflow. There is no
dedicated server unit/integration suite yet; protocol validation, CORS behavior,
disconnect cleanup, load behavior, and abuse controls should be covered before
treating the service as release-complete.
