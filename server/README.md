# Drawink Collaboration Server

Real-time collaboration server for Drawink using Socket.io.

Based on the [Excalidraw collaboration server](https://github.com/excalidraw/excalidraw-room).

## Features

- Real-time collaborative editing
- Encrypted scene updates
- User presence (cursors, selections)
- User following (viewport sync)
- Room-based collaboration

## Architecture

This server is part of the Drawink hybrid architecture:

- **Collaboration (this server)**: Socket.io for real-time features
- **Database**: Convex for persistence, auth, and business logic
- **File Storage**: Firebase Storage for images and files

## Development

```bash
# Install dependencies
bun install

# Run in development mode (with hot reload)
bun run dev

# Or run directly
bun run start
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
PORT=3003
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

## Deployment

### Docker

```dockerfile
FROM oven/bun:1.3.3
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --production
COPY . .
EXPOSE 3003
CMD ["bun", "index.ts"]
```

### Cloud Run (Google Cloud)

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/drawink-collab
gcloud run deploy drawink-collab \
  --image gcr.io/PROJECT_ID/drawink-collab \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="CORS_ORIGIN=https://canvas.drawink.app"
```

## Protocol

The server uses the following Socket.io events:

### Client → Server

- `join-room`: Join a collaboration room
- `server-broadcast`: Broadcast scene update to room
- `server-volatile-broadcast`: Broadcast volatile update (cursor, etc.)
- `user-follow`: Follow/unfollow a user's viewport

### Server → Client

- `init-room`: Room initialization
- `first-in-room`: First user in room
- `new-user`: New user joined
- `client-broadcast`: Scene update from another user
- `room-user-change`: Room user list changed
- `user-follow-room-change`: Follower list changed

## Security

All scene data is encrypted client-side before transmission. The server only handles encrypted blobs.
