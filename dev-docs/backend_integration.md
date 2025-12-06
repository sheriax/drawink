# JSON Backend System Documentation

This documentation analyzes the current implementation of the JSON backend system in `sheriax_board` and provides a comprehensive guide for implementing a compatible custom backend.

## 1. Current Implementation Analysis

The backend system relies on two environment variables to handle the storage and retrieval of scene data. The "JSON backend" is effectively a **binary blob storage** service from the server's perspective, as all encryption, compression, and serialization happen on the client side.

### Endpoint Usage

| Env Variable | HTTP Method | Usage | Description |
| :-- | :-- | :-- | :-- |
| `VITE_APP_BACKEND_V2_GET_URL` | `GET` | `${URL}${id}` | Fetches the stored scene data by ID. |
| `VITE_APP_BACKEND_V2_POST_URL` | `POST` | `${URL}` | Uploads a new scene and returns a unique ID. |

#### GET Request

- **URL**: Constructed by appending the `id` directly to the `VITE_APP_BACKEND_V2_GET_URL` (e.g., `https://api.example.com/v2/scenes/123`).
- **Headers**: None specific (standard `fetch`).
- **Response**: Returns the raw binary buffer (`ArrayBuffer`).
- **Error Handling**: If `response.ok` is false, it alerts the user (`alerts.importBackendFailed`).

#### POST Request

- **URL**: Uses `VITE_APP_BACKEND_V2_POST_URL` exactly as provided.
- **Headers**: No `Content-Type` is explicitly set (browser usually defaults to `application/octet-stream` or empty for binary bodies).
- **Body**: A raw binary `Uint8Array` (encrypted and compressed scene data).
- **Response**: JSON object containing the generated ID or an error class.
  ```json
  {
    "id": "generated_unique_id"
  }
  ```
- **Error Handling**: Checks for specific error classes like `"RequestTooLargeError"`.

### Data Structure

#### Client-Side (Internal)

The data is a complex binary structure created by `compressData` in `packages/drawink/data/encode.ts`.

1.  **Serialization**: Elements and AppState are serialized to JSON.
2.  **Compression**: The JSON is deflated (zlib/pako).
3.  **Encryption**: The compressed data is encrypted using AES-GCM with a locally generated key.
4.  **Packaging**: The final binary blob is a concatenated buffer containing:
    - Encoding Metadata (JSON)
    - Initialization Vector (IV)
    - Encrypted Content

#### Server-Side

The server **does not** need to understand this structure. It treats the payload as an opaque binary blob.

## 2. Custom JSON Server Implementation Guide

This guide outlines how to build a compatible backend using Node.js.

### Setup Requirements

- **Tools**: Node.js, Express (or Hono/Fastify).
- **Database**: Any key-value store or file system (e.g., Redis, MongoDB, Postgres, or simple disk storage).
- **Dependencies**: `express`, `cors`, `body-parser` (for raw body support).

### Database Schema

You only need a simple mapping table:

| Field        | Type        | Description                                     |
| :----------- | :---------- | :---------------------------------------------- |
| `id`         | String (PK) | Unique identifier (e.g., 16-char random string) |
| `data`       | Blob/Binary | The raw request body                            |
| `created_at` | Timestamp   | For expiration/cleanup (optional)               |

### Endpoint Implementation (Node.js/Express Example)

Create a file `server.js`:

```javascript
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const app = express();
const port = 3000;

// In-memory storage for demonstration (Use a real DB in production)
const db = new Map();

app.use(cors());

// Middleware to handle raw binary data with a large limit
app.use(express.raw({ type: "*/*", limit: "2mb" }));

// GET Endpoint matching VITE_APP_BACKEND_V2_GET_URL
// Usage in .env: VITE_APP_BACKEND_V2_GET_URL=http://localhost:3000/api/v2/
app.get("/api/v2/:id", (req, res) => {
  const id = req.params.id;
  const data = db.get(id);

  if (data) {
    // Return the raw buffer
    res.send(data);
  } else {
    res.status(404).send("Scene not found");
  }
});

// POST Endpoint matching VITE_APP_BACKEND_V2_POST_URL
// Usage in .env: VITE_APP_BACKEND_V2_POST_URL=http://localhost:3000/api/v2/post
app.post("/api/v2/post", (req, res) => {
  try {
    const buffer = req.body;

    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return res.status(400).json({ error: "Empty body" });
    }

    // Generate a random ID (similar to nanoid)
    const id = crypto.randomBytes(8).toString("hex");

    // Store the data
    db.set(id, buffer);

    // Return the ID in the expected JSON format
    res.json({ id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Custom backend listening at http://localhost:${port}`);
});
```

### Deployment Considerations

- **Environment Variables**: Configure your `.env` file in the frontend project:

  ```bash
  VITE_APP_BACKEND_V2_GET_URL=http://localhost:3000/api/v2/
  VITE_APP_BACKEND_V2_POST_URL=http://localhost:3000/api/v2/post
  ```

  _Note: The trailing slash in `GET_URL` is important because the app appends the ID directly._

- **Performance**:

  - Use a fast key-value store like Redis for low latency.
  - The binary payloads are already compressed by the client, so server-side GZIP is redundant for the `data` field.

- **Security**:
  - **Rate Limiting**: Essential to prevent abuse (storage filling).
  - **Size Limits**: Enforce a strict body size limit (e.g., 2MB) to prevent DoS attacks. Return a `RequestTooLargeError` JSON if exceeded to match client expectations.

### Migration & Limitations

- **Image/File Storage**: This backend implementation **only** handles the scene data (JSON/elements).
  - **Current Limitation**: The application currently relies on Firebase Storage for uploading images/files referenced in the scene (`drawink-app/data/firebase.ts`).
  - **Workaround**: Unless you also reimplement the Firebase Storage logic or modify `saveFilesToFirebase`, images added to the board might not persist correctly when using a custom backend.
- **Data Migration**: Since the data is client-side encrypted, you can migrate data simply by copying the binary blobs from the old store to the new one, preserving the IDs. No decryption is required or possible server-side.
