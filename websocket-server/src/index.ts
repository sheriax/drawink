import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { ServerWebSocket } from "bun";

const app = new Hono();

// Store connected clients by room
const rooms = new Map<string, Set<ServerWebSocket<{ roomId: string }>>>();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "websocket-server",
    rooms: rooms.size,
    connections: Array.from(rooms.values()).reduce(
      (acc, set) => acc + set.size,
      0
    ),
  });
});

// WebSocket info endpoint
app.get("/ws/info", (c) => {
  return c.json({
    message: "WebSocket server is running",
    wsEndpoint: "/ws/:roomId",
    activeRooms: Array.from(rooms.keys()),
  });
});

// Start server with WebSocket support
const port = parseInt(
  process.env.WEBSOCKET_SERVER_PORT || process.env.PORT || "3003",
  10
);

console.log(`🔌 WebSocket server running at http://localhost:${port}`);
console.log(`   WS  /ws/:roomId  - Join a collaboration room`);
console.log(`   GET /health      - Health check`);
console.log(`   GET /ws/info     - WebSocket info`);

export default {
  port,
  fetch: app.fetch,
  websocket: {
    open(ws: ServerWebSocket<{ roomId: string }>) {
      const roomId = ws.data.roomId;

      // Add client to room
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }
      rooms.get(roomId)!.add(ws);

      console.log(
        `[Room ${roomId}] Client connected. Total in room: ${rooms.get(roomId)!.size}`
      );

      // Notify others in the room
      const joinMessage = JSON.stringify({
        type: "user_joined",
        roomId,
        timestamp: Date.now(),
      });

      rooms.get(roomId)!.forEach((client) => {
        if (client !== ws && client.readyState === 1) {
          client.send(joinMessage);
        }
      });
    },

    message(ws: ServerWebSocket<{ roomId: string }>, message: string | Buffer) {
      const roomId = ws.data.roomId;
      const room = rooms.get(roomId);

      if (!room) return;

      // Broadcast message to all other clients in the same room
      room.forEach((client) => {
        if (client !== ws && client.readyState === 1) {
          client.send(message);
        }
      });
    },

    close(ws: ServerWebSocket<{ roomId: string }>) {
      const roomId = ws.data.roomId;
      const room = rooms.get(roomId);

      if (room) {
        room.delete(ws);

        console.log(
          `[Room ${roomId}] Client disconnected. Total in room: ${room.size}`
        );

        // Clean up empty rooms
        if (room.size === 0) {
          rooms.delete(roomId);
          console.log(`[Room ${roomId}] Room closed (no clients)`);
        } else {
          // Notify others in the room
          const leaveMessage = JSON.stringify({
            type: "user_left",
            roomId,
            timestamp: Date.now(),
          });

          room.forEach((client) => {
            if (client.readyState === 1) {
              client.send(leaveMessage);
            }
          });
        }
      }
    },

    error(ws: ServerWebSocket<{ roomId: string }>, error: Error) {
      console.error(`[WebSocket Error] ${error.message}`);
    },
  },
};
