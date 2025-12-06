# JSON Backend

A lightweight [Hono](https://hono.dev/) + [Bun](https://bun.sh/) backend server for storing and retrieving scene data in the sheriax_board application.

## Prerequisites

- [Bun](https://bun.sh/) v1.0.0 or later

## Installation

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install
```

## Development

```bash
# Start development server with hot reload
bun run dev
```

## Production

```bash
# Start production server
bun run start

# Or build and run
bun run build
bun run ./dist/index.js
```

## API Endpoints

### GET `/api/v2/:id`

Fetch stored scene data by ID.

- **Response**: Raw binary buffer (`ArrayBuffer`)
- **Error**: `404` if scene not found

### POST `/api/v2/post`

Upload new scene data and receive a unique ID.

- **Body**: Raw binary data (`Uint8Array`)
- **Response**: `{ "id": "generated_unique_id" }`
- **Error**: `413` if payload exceeds 2MB limit

### GET `/health`

Health check endpoint.

- **Response**: `{ "status": "ok" }`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |

## Frontend Configuration

Configure your frontend `.env` file to use this backend:

```bash
VITE_APP_BACKEND_V2_GET_URL=http://localhost:3000/api/v2/
VITE_APP_BACKEND_V2_POST_URL=http://localhost:3000/api/v2/post
```

> **Note**: The trailing slash in `GET_URL` is important because the app appends the ID directly.

## Data Storage

Currently uses in-memory storage (Map) for demonstration. For production, consider:

- Redis for low-latency key-value storage
- PostgreSQL with bytea columns
- MongoDB with Binary data type
- File system with proper cleanup policies

## Limitations

- **In-Memory Storage**: Data is lost on server restart (demo only)
- **Image Storage**: This backend only handles scene data. Images still use Firebase Storage.
