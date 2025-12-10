import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { db, SCENES_COLLECTION } from "./firebase";

const app = new Hono();

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
app.get("/health", async (c) => {
  try {
    // Test Firestore connection
    await db.collection(SCENES_COLLECTION).limit(1).get();
    return c.json({ status: "ok", firestore: "connected" });
  } catch (error) {
    console.error("Health check failed:", error);
    return c.json({ status: "degraded", firestore: "disconnected" }, 503);
  }
});

// GET /api/v2/:id - Fetch stored scene data by ID
app.get("/api/v2/:id", async (c) => {
  const id = c.req.param("id");

  if (!id) {
    return c.text("ID is required", 400);
  }

  try {
    const docRef = db.collection(SCENES_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data();
      if (data && data.sceneData) {
        // Convert base64 back to binary
        const binaryData = Buffer.from(data.sceneData, "base64");
        c.header("Content-Type", "application/octet-stream");
        return c.body(binaryData);
      }
    }

    return c.text("Scene not found", 404);
  } catch (error) {
    console.error("Error fetching scene:", error);
    return c.json({ error: "Internal Server Error" }, 500);
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

    // Convert ArrayBuffer to base64 for Firestore storage
    const base64Data = Buffer.from(buffer).toString("base64");

    // Store in Firestore
    await db.collection(SCENES_COLLECTION).doc(id).set({
      sceneData: base64Data,
      createdAt: new Date().toISOString(),
      size: buffer.byteLength,
    });

    return c.json({ id });
  } catch (error) {
    console.error("Error processing POST request:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Start server
const port = parseInt(process.env.JSON_BACKEND_PORT || process.env.PORT || "3001", 10);

console.log(`🚀 JSON Backend server running at http://localhost:${port}`);
console.log(`📦 Using Firestore for persistent storage`);
console.log(`   GET  /api/v2/:id   - Fetch scene data`);
console.log(`   POST /api/v2/post  - Store scene data`);
console.log(`   GET  /health       - Health check`);

export default {
  port,
  fetch: app.fetch,
};
