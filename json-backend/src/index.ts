import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

// In-memory storage for demonstration (Use a real DB in production)
const db = new Map<string, ArrayBuffer>();

// Generate a random ID (16-char hex string)
function generateId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2MB limit

// Middleware
app.use("*", logger());
app.use("*", cors());

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// GET /api/v2/:id - Fetch stored scene data by ID
app.get("/api/v2/:id", (c) => {
  const id = c.req.param("id");

  if (!id) {
    return c.text("ID is required", 400);
  }

  const data = db.get(id);

  if (data) {
    c.header("Content-Type", "application/octet-stream");
    return c.body(data);
  } else {
    return c.text("Scene not found", 404);
  }
});

// POST /api/v2/post - Upload new scene and return unique ID
app.post("/api/v2/post", async (c) => {
  try {
    const contentLength = parseInt(c.req.header("content-length") || "0", 10);

    // Check size limit before reading the body
    if (contentLength > MAX_BODY_SIZE) {
      return c.json({ error: "RequestTooLargeError" }, 413);
    }

    const buffer = await c.req.arrayBuffer();

    if (buffer.byteLength === 0) {
      return c.json({ error: "Empty body" }, 400);
    }

    // Additional check after reading
    if (buffer.byteLength > MAX_BODY_SIZE) {
      return c.json({ error: "RequestTooLargeError" }, 413);
    }

    const id = generateId();
    db.set(id, buffer);

    return c.json({ id });
  } catch (error) {
    console.error("Error processing POST request:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Start server
const port = parseInt(process.env.JSON_BACKEND_PORT || process.env.PORT || "3001", 10);

console.log(`🚀 JSON Backend server running at http://localhost:${port}`);
console.log(`   GET  /api/v2/:id   - Fetch scene data`);
console.log(`   POST /api/v2/post  - Store scene data`);
console.log(`   GET  /health       - Health check`);

export default {
  port,
  fetch: app.fetch,
};
