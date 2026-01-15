import type { Socket } from "socket.io";
import { Server as SocketIO } from "socket.io";

type UserToFollow = {
  socketId: string;
  username: string;
};

type OnUserFollowedPayload = {
  userToFollow: UserToFollow;
  action: "FOLLOW" | "UNFOLLOW";
};

const port = parseInt(
  process.env.WEBSOCKET_SERVER_PORT || process.env.PORT || "3003",
  10
);

const corsOrigin = process.env.CORS_ORIGIN || "*";

console.log(`🔌 Drawink WebSocket Server starting on port ${port}...`);

// Create socket.io server with Bun's native HTTP server
const io = new SocketIO(port, {
  transports: ["websocket", "polling"],
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
  allowEIO3: true,
});

io.on("connection", (socket: Socket) => {
  console.log(`[Socket] New connection: ${socket.id}`);

  // Notify client that room is ready
  io.to(`${socket.id}`).emit("init-room");

  socket.on("join-room", async (roomID: string) => {
    console.log(`[Room] ${socket.id} joining room: ${roomID}`);
    await socket.join(roomID);

    const sockets = await io.in(roomID).fetchSockets();

    if (sockets.length <= 1) {
      // First user in room
      io.to(`${socket.id}`).emit("first-in-room");
    } else {
      // Notify existing users of new user
      console.log(`[Room] Notifying room ${roomID} of new user ${socket.id}`);
      socket.broadcast.to(roomID).emit("new-user", socket.id);
    }

    // Broadcast updated user list to room
    io.in(roomID).emit(
      "room-user-change",
      sockets.map((s: { id: string }) => s.id)
    );
  });

  // Handle scene broadcasts (reliable)
  socket.on(
    "server-broadcast",
    (roomID: string, encryptedData: ArrayBuffer, iv: Uint8Array) => {
      console.log(`[Broadcast] ${socket.id} -> room ${roomID}`);
      socket.broadcast.to(roomID).emit("client-broadcast", encryptedData, iv);
    }
  );

  // Handle volatile broadcasts (cursor position, etc - can be dropped)
  socket.on(
    "server-volatile-broadcast",
    (roomID: string, encryptedData: ArrayBuffer, iv: Uint8Array) => {
      socket.volatile.broadcast
        .to(roomID)
        .emit("client-broadcast", encryptedData, iv);
    }
  );

  // Handle user follow/unfollow
  socket.on("user-follow", async (payload: OnUserFollowedPayload) => {
    const roomID = `follow@${payload.userToFollow.socketId}`;

    switch (payload.action) {
      case "FOLLOW": {
        await socket.join(roomID);

        const sockets = await io.in(roomID).fetchSockets();
        const followedBy = sockets.map((s: { id: string }) => s.id);

        io.to(payload.userToFollow.socketId).emit(
          "user-follow-room-change",
          followedBy
        );
        break;
      }
      case "UNFOLLOW": {
        await socket.leave(roomID);

        const sockets = await io.in(roomID).fetchSockets();
        const followedBy = sockets.map((s: { id: string }) => s.id);

        io.to(payload.userToFollow.socketId).emit(
          "user-follow-room-change",
          followedBy
        );
        break;
      }
    }
  });

  // Handle disconnecting (before fully disconnected)
  socket.on("disconnecting", async () => {
    console.log(`[Socket] ${socket.id} disconnecting...`);

    for (const roomID of Array.from(socket.rooms) as string[]) {
      if (roomID === socket.id) continue; // Skip the default room

      const otherClients = (await io.in(roomID).fetchSockets()).filter(
        (s: { id: string }) => s.id !== socket.id
      );

      const isFollowRoom = roomID.startsWith("follow@");

      if (!isFollowRoom && otherClients.length > 0) {
        // Notify remaining users
        socket.broadcast.to(roomID).emit(
          "room-user-change",
          otherClients.map((s: { id: string }) => s.id)
        );
      }

      if (isFollowRoom && otherClients.length === 0) {
        const socketId = roomID.replace("follow@", "");
        io.to(socketId).emit("broadcast-unfollow");
      }
    }
  });

  // Handle full disconnect
  socket.on("disconnect", () => {
    console.log(`[Socket] ${socket.id} disconnected`);
    socket.removeAllListeners();
  });

  // Voice chat signaling events
  socket.on("voice-offer", (data: { targetSocketId: string; offer: RTCSessionDescriptionInit }) => {
    console.log(`[Voice] ${socket.id} sending offer to ${data.targetSocketId}`);
    io.to(data.targetSocketId).emit("voice-offer", {
      fromSocketId: socket.id,
      offer: data.offer,
    });
  });

  socket.on("voice-answer", (data: { targetSocketId: string; answer: RTCSessionDescriptionInit }) => {
    console.log(`[Voice] ${socket.id} sending answer to ${data.targetSocketId}`);
    io.to(data.targetSocketId).emit("voice-answer", {
      fromSocketId: socket.id,
      answer: data.answer,
    });
  });

  socket.on("voice-ice-candidate", (data: { targetSocketId: string; candidate: RTCIceCandidateInit }) => {
    io.to(data.targetSocketId).emit("voice-ice-candidate", {
      fromSocketId: socket.id,
      candidate: data.candidate,
    });
  });

  socket.on("voice-mute-state", (data: { roomID: string; isMuted: boolean }) => {
    console.log(`[Voice] ${socket.id} mute state: ${data.isMuted}`);
    socket.broadcast.to(data.roomID).emit("voice-mute-state", {
      socketId: socket.id,
      isMuted: data.isMuted,
    });
  });
});

console.log(`✅ Drawink WebSocket Server running on port ${port}`);
console.log(`   CORS: ${corsOrigin}`);
console.log(`   Transports: websocket, polling`);
console.log(`   Voice chat: enabled`);