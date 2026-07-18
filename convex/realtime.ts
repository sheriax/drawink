/**
 * Convex-native realtime relay.
 *
 * Payloads stay end-to-end encrypted with the room key. Convex sees only the
 * room, sender, delivery channel, and short retention metadata needed to fan
 * updates out through reactive query subscriptions.
 */

import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";

const MAX_MESSAGE_BYTES = 700 * 1024;
const MAX_MESSAGES_PER_SECOND = 60;
const ACTIVE_SESSION_MS = 30 * 1000;
const DURABLE_MESSAGE_TTL_MS = 2 * 60 * 1000;
const VOLATILE_MESSAGE_TTL_MS = 30 * 1000;

const sessionResult = v.object({
  sessionId: v.string(),
  followingSessionId: v.optional(v.string()),
});

const messageResult = v.object({
  _id: v.id("collaborationMessages"),
  senderSessionId: v.string(),
  channel: v.string(),
  encryptedData: v.bytes(),
  iv: v.bytes(),
  createdAt: v.number(),
});

const validateIdentifiers = (roomId: string, sessionId: string) => {
  if (roomId.length === 0 || roomId.length > 128) {
    throw new Error("Invalid room ID");
  }
  if (sessionId.length < 16 || sessionId.length > 128) {
    throw new Error("Invalid session ID");
  }
};

const validateAccessToken = (accessToken: string) => {
  if (accessToken.length < 32 || accessToken.length > 128) {
    throw new Error("Invalid access token");
  }
};

const assertSessionAccess = async (
  ctx: QueryCtx | MutationCtx,
  roomId: string,
  sessionId: string,
  accessToken: string,
) => {
  validateIdentifiers(roomId, sessionId);
  validateAccessToken(accessToken);
  const session = await ctx.db
    .query("collaborationSessions")
    .withIndex("by_room_and_session", (q) => q.eq("roomId", roomId).eq("sessionId", sessionId))
    .first();
  if (!session || session.accessToken !== accessToken) {
    throw new Error("Access denied");
  }
  return session;
};

export const joinRoom = mutation({
  args: {
    roomId: v.string(),
    accessToken: v.string(),
    sessionId: v.string(),
    userName: v.string(),
  },
  returns: v.object({ activeCount: v.number() }),
  handler: async (ctx, args) => {
    validateIdentifiers(args.roomId, args.sessionId);
    validateAccessToken(args.accessToken);

    const room = await ctx.db
      .query("collaborativeRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();
    if (room?.accessToken !== undefined && room.accessToken !== args.accessToken) {
      throw new Error("Access denied");
    }

    const existing = await ctx.db
      .query("collaborationSessions")
      .withIndex("by_room_and_session", (q) =>
        q.eq("roomId", args.roomId).eq("sessionId", args.sessionId),
      )
      .first();
    if (existing?.accessToken !== undefined && existing.accessToken !== args.accessToken) {
      throw new Error("Access denied");
    }

    const roomSessions = await ctx.db
      .query("collaborationSessions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const establishedSession = roomSessions.find((session) => session.accessToken !== undefined);
    if (
      room?.accessToken === undefined &&
      establishedSession?.accessToken !== undefined &&
      establishedSession.accessToken !== args.accessToken
    ) {
      throw new Error("Access denied");
    }

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        sessionType: "room",
        accessToken: args.accessToken,
        userName: args.userName.slice(0, 80),
        isActive: true,
        lastHeartbeat: now,
      });
    } else {
      await ctx.db.insert("collaborationSessions", {
        roomId: args.roomId,
        sessionType: "room",
        sessionId: args.sessionId,
        accessToken: args.accessToken,
        userId: args.sessionId,
        userName: args.userName.slice(0, 80),
        isActive: true,
        lastHeartbeat: now,
        joinedAt: now,
        messageWindowStartedAt: now,
        messageCount: 0,
      });
    }

    const activeSessions = await ctx.db
      .query("collaborationSessions")
      .withIndex("by_room_active", (q) => q.eq("roomId", args.roomId).eq("isActive", true))
      .collect();
    return {
      activeCount: activeSessions.filter(
        (session) => now - session.lastHeartbeat < ACTIVE_SESSION_MS,
      ).length,
    };
  },
});

export const leaveRoom = mutation({
  args: {
    roomId: v.string(),
    accessToken: v.string(),
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await assertSessionAccess(ctx, args.roomId, args.sessionId, args.accessToken);
    await ctx.db.delete(session._id);
    return null;
  },
});

export const heartbeat = mutation({
  args: {
    roomId: v.string(),
    accessToken: v.string(),
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await assertSessionAccess(ctx, args.roomId, args.sessionId, args.accessToken);
    await ctx.db.patch(session._id, { isActive: true, lastHeartbeat: Date.now() });
    return null;
  },
});

export const updateFollowing = mutation({
  args: {
    roomId: v.string(),
    accessToken: v.string(),
    sessionId: v.string(),
    followingSessionId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await assertSessionAccess(ctx, args.roomId, args.sessionId, args.accessToken);
    if (args.followingSessionId !== undefined) {
      validateIdentifiers(args.roomId, args.followingSessionId);
    }
    await ctx.db.patch(session._id, {
      followingSessionId: args.followingSessionId,
      lastHeartbeat: Date.now(),
    });
    return null;
  },
});

export const listRoomSessions = query({
  args: {
    roomId: v.string(),
    accessToken: v.string(),
    sessionId: v.string(),
  },
  returns: v.array(sessionResult),
  handler: async (ctx, args) => {
    await assertSessionAccess(ctx, args.roomId, args.sessionId, args.accessToken);

    const now = Date.now();
    const sessions = await ctx.db
      .query("collaborationSessions")
      .withIndex("by_room_active", (q) => q.eq("roomId", args.roomId).eq("isActive", true))
      .collect();

    return sessions
      .filter(
        (session) =>
          session.sessionId !== undefined && now - session.lastHeartbeat < ACTIVE_SESSION_MS,
      )
      .map((session) => ({
        sessionId: session.sessionId!,
        followingSessionId: session.followingSessionId,
      }));
  },
});

export const publishRoomMessage = mutation({
  args: {
    roomId: v.string(),
    accessToken: v.string(),
    sessionId: v.string(),
    channel: v.string(),
    encryptedData: v.bytes(),
    iv: v.bytes(),
    isVolatile: v.boolean(),
  },
  returns: v.id("collaborationMessages"),
  handler: async (ctx, args) => {
    if (args.encryptedData.byteLength > MAX_MESSAGE_BYTES) {
      throw new Error("Collaboration message is too large");
    }
    if (args.iv.byteLength < 12 || args.iv.byteLength > 32) {
      throw new Error("Invalid encryption IV");
    }
    if (args.channel !== args.roomId && args.channel !== `follow@${args.sessionId}`) {
      throw new Error("Invalid collaboration channel");
    }

    const session = await assertSessionAccess(ctx, args.roomId, args.sessionId, args.accessToken);
    const now = Date.now();
    const windowStartedAt = session.messageWindowStartedAt ?? now;
    const isCurrentWindow = now - windowStartedAt < 1000;
    const messageCount = isCurrentWindow ? (session.messageCount ?? 0) + 1 : 1;
    if (messageCount > MAX_MESSAGES_PER_SECOND) {
      throw new Error("Collaboration rate limit exceeded");
    }

    await ctx.db.patch(session._id, {
      lastHeartbeat: now,
      messageWindowStartedAt: isCurrentWindow ? windowStartedAt : now,
      messageCount,
    });

    return await ctx.db.insert("collaborationMessages", {
      roomId: args.roomId,
      senderSessionId: args.sessionId,
      channel: args.channel,
      encryptedData: args.encryptedData,
      iv: args.iv,
      isVolatile: args.isVolatile,
      createdAt: now,
      expiresAt: now + (args.isVolatile ? VOLATILE_MESSAGE_TTL_MS : DURABLE_MESSAGE_TTL_MS),
    });
  },
});

export const listRoomMessages = query({
  args: {
    roomId: v.string(),
    accessToken: v.string(),
    sessionId: v.string(),
  },
  returns: v.array(messageResult),
  handler: async (ctx, args) => {
    await assertSessionAccess(ctx, args.roomId, args.sessionId, args.accessToken);

    const messages = await ctx.db
      .query("collaborationMessages")
      .withIndex("by_room_and_created_at", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(16);

    return messages.reverse().map((message) => ({
      _id: message._id,
      senderSessionId: message.senderSessionId,
      channel: message.channel,
      encryptedData: message.encryptedData,
      iv: message.iv,
      createdAt: message.createdAt,
    }));
  },
});

export const cleanupExpired = internalMutation({
  args: {},
  returns: v.object({ messages: v.number(), sessions: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    const messages = await ctx.db
      .query("collaborationMessages")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .take(500);
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    const sessions = await ctx.db
      .query("collaborationSessions")
      .withIndex("by_type_and_last_heartbeat", (q) =>
        q.eq("sessionType", "room").lt("lastHeartbeat", now - ACTIVE_SESSION_MS * 2),
      )
      .take(500);
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    return { messages: messages.length, sessions: sessions.length };
  },
});
