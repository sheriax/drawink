# WebSocket Server

Real-time collaboration server for Drawink using WebSockets.

## Features

- Room-based collaboration
- Real-time message broadcasting
- Automatic room cleanup when empty
- Health check endpoint

## Development

```bash
# Install dependencies
bun install

# Start development server (with hot reload)
bun run dev

# Build for production
bun run build
```

## API Endpoints

### HTTP Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with room/connection stats |
| GET | `/ws/info` | WebSocket server info |

### WebSocket Endpoint

| Endpoint | Description |
|----------|-------------|
| `/ws/:roomId` | Join a collaboration room |

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `WEBSOCKET_SERVER_PORT` | `3003` | Server port |
| `PORT` | `3003` | Fallback port (Cloud Run) |

## Message Format

### Server-to-Client Messages

```json
{
  "type": "user_joined",
  "roomId": "abc123",
  "timestamp": 1699999999999
}
```

```json
{
  "type": "user_left",
  "roomId": "abc123",
  "timestamp": 1699999999999
}
```

### Client-to-Client Messages

All messages sent by a client are broadcast to all other clients in the same room. The server does not process the message content - it simply forwards messages as-is.

## Docker

The websocket-server is included in the main Docker image and runs alongside the frontend and json-server via supervisor.

Port configuration in Docker:
- Nginx (frontend): 3000
- JSON Server: 3001
- WebSocket Server: 3003

Nginx proxies WebSocket connections from `/ws/*` to the WebSocket server.
