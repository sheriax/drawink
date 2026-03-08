# Drawink Collab Server

Real-time collaboration server for [Drawink](https://drawink.app) — powered by **Socket.io** and **Bun**.

## What It Does

Handles real-time collaboration features that need low-latency WebSocket connections:

- **Room-based collaboration** — users join shared rooms to co-edit
- **Encrypted scene sync** — scene updates are encrypted client-side before transmission
- **Cursor & selection presence** — live cursor tracking across collaborators
- **User following** — sync viewports between users
- **Volatile broadcasts** — ephemeral updates (cursors) that don't need guaranteed delivery

> All persistent data (boards, users, files) lives in **Convex** — this server only handles real-time transport.

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
bun install

# Start with hot reload
bun run dev

# Or start directly
bun run start
```

The server runs on `http://localhost:3003` by default.

> **Tip:** From the root project, `bun dev` starts both the Vite app and this collab server concurrently.

## Environment Variables

| Variable | Dev Default | Production | Description |
|---|---|---|---|
| `PORT` | `3003` | `3003` | Server port |
| `NODE_ENV` | `development` | `production` | Environment |
| `CORS_ORIGIN` | `http://localhost:5173` | `https://drawink.app` | Allowed frontend origin |

Config files: `.env.development` (local) and `.env.production` (deployed).

## Deployment

### Current: Google Cloud Run

The server is deployed on **Google Cloud Run** in the `drawink-2026` GCP project:

- **Region:** `asia-south1` (Mumbai)
- **Image:** `asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink:latest`
- **URL:** `https://drawink-731425062456.asia-south1.run.app`

#### Deploy Steps

```bash
# 1. Build and push Docker image to Artifact Registry
gcloud builds submit --tag asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink:latest

# 2. Deploy to Cloud Run
gcloud run deploy drawink \
  --image asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars="CORS_ORIGIN=https://drawink.app,PORT=3003,NODE_ENV=production"
```

> **Note:** No custom domain is mapped yet. The frontend currently references `collab.drawink.app` in `.env.production` — this needs to be updated to the actual Cloud Run URL or a custom domain needs to be mapped.

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

All scene data is **end-to-end encrypted** — the server only relays opaque encrypted blobs and never sees drawing content.
