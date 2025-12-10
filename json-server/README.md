# JSON Backend

A lightweight [Hono](https://hono.dev/) + [Bun](https://bun.sh/) backend server for storing and retrieving scene data in the sheriax_board application.

## Prerequisites

- [Bun](https://bun.sh/) v1.0.0 or later
- Firebase project with Firestore enabled

## Installation

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install
```

## Firebase Setup

### Local Development

For local development, you need to set up Firebase credentials:

1. Go to [Firebase Console](https://console.firebase.google.com/) > Project Settings > Service Accounts
2. Click "Generate new private key" to download the service account JSON file
3. Set the environment variable:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

Or create a `.env` file in the json-backend directory:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### Cloud Run Deployment

When deployed to Google Cloud Run, the service automatically uses the default service account. No additional configuration is needed as long as the service account has Firestore permissions.

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

- **Response**: `{ "status": "ok", "firestore": "connected" }`
- **Error**: `503` if Firestore is disconnected

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Firebase service account JSON (local dev) | - |
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID (auto-set in Cloud Run) | `drawink-2026` |

## Frontend Configuration

Configure your frontend `.env` file to use this backend:

```bash
VITE_APP_BACKEND_V2_GET_URL=http://localhost:3001/api/v2/
VITE_APP_BACKEND_V2_POST_URL=http://localhost:3001/api/v2/post
```

> **Note**: The trailing slash in `GET_URL` is important because the app appends the ID directly.

## Data Storage

Uses **Firebase Firestore** for persistent storage. Scene data is stored in the `scenes` collection with the following schema:

```typescript
{
  sceneData: string,    // Base64 encoded binary data
  createdAt: string,    // ISO timestamp
  size: number          // Original size in bytes
}
```

### Firestore Security Rules

The Firestore security rules are configured in `firebase-project/firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow get, write: if true;
      allow list: if false;
    }
  }
}
```

## Limitations

- **Image Storage**: This backend only handles scene data. Images still use Firebase Storage.

## Docker Deployment

The json-backend is included in the main Docker image and runs alongside the frontend via supervisor.

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build the Docker image directly
docker build -t sheriax-board .
docker run -p 3000:80 -p 3001:3001 sheriax-board
```

In Docker, the nginx server proxies `/api/v2/*` requests to the json-backend, so both frontend and API are served from port 80.

