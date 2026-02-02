/**
 * Convex Collaboration Functions
 *
 * Real-time collaboration features for Drawink boards:
 * - Live presence (who's on the board)
 * - Live cursor tracking
 * - Heartbeat system for presence detection
 * - Automatic stale session cleanup
 */

import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type QueryCtx, mutation, query } from "./_generated/server";
import { getUserId } from "./users";

/**
 * Internal helper to get active users for a board
 * Can be called from other queries
 *
 * Note: This is a query helper, so it can't mutate data.
 * Stale session cleanup happens in the cleanupStaleSessions mutation.
 */
async function getActiveUsersInternal(
  ctx: QueryCtx,
  boardId: Id<"boards">,
): Promise<Doc<"collaborationSessions">[]> {
  // Get all sessions for this board
  const sessions = await ctx.db
    .query("collaborationSessions")
    .withIndex("by_board_active", (q) => q.eq("boardId", boardId).eq("isActive", true))
    .collect();

  // Filter out stale sessions (no heartbeat in last 30 seconds)
  // Note: We filter but don't mark as inactive (that's done by cleanupStaleSessions)
  const now = Date.now();
  const activeThreshold = 30 * 1000; // 30 seconds

  const activeSessions = sessions.filter(
    (session) => now - session.lastHeartbeat < activeThreshold,
  );

  return activeSessions;
}

/**
 * Join a board (start collaborative session)
 */
export const join = mutation({
  args: {
    boardId: v.id("boards"),
    userName: v.string(),
    userPhotoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    // Check if user already has a session for this board
    const existing = await ctx.db
      .query("collaborationSessions")
      .withIndex("by_board_and_user", (q) => q.eq("boardId", args.boardId).eq("userId", userId))
      .first();

    if (existing) {
      // Reactivate existing session
      await ctx.db.patch(existing._id, {
        isActive: true,
        lastHeartbeat: Date.now(),
        userName: args.userName, // Update name in case it changed
        userPhotoUrl: args.userPhotoUrl,
      });
      return existing._id;
    }

    // Create new session
    return await ctx.db.insert("collaborationSessions", {
      boardId: args.boardId,
      userId,
      userName: args.userName,
      userPhotoUrl: args.userPhotoUrl,
      cursorX: 0,
      cursorY: 0,
      isActive: true,
      lastHeartbeat: Date.now(),
      joinedAt: Date.now(),
    });
  },
});

/**
 * Leave a board (end collaborative session)
 */
export const leave = mutation({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    const session = await ctx.db
      .query("collaborationSessions")
      .withIndex("by_board_and_user", (q) => q.eq("boardId", args.boardId).eq("userId", userId))
      .first();

    if (session) {
      await ctx.db.patch(session._id, {
        isActive: false,
      });
    }
  },
});

/**
 * Update cursor position
 */
export const updateCursor = mutation({
  args: {
    boardId: v.id("boards"),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    const session = await ctx.db
      .query("collaborationSessions")
      .withIndex("by_board_and_user", (q) => q.eq("boardId", args.boardId).eq("userId", userId))
      .first();

    if (session) {
      await ctx.db.patch(session._id, {
        cursorX: args.x,
        cursorY: args.y,
        lastHeartbeat: Date.now(), // Update heartbeat on cursor move
      });
    }
  },
});

/**
 * Send heartbeat (keep session alive)
 */
export const heartbeat = mutation({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    const session = await ctx.db
      .query("collaborationSessions")
      .withIndex("by_board_and_user", (q) => q.eq("boardId", args.boardId).eq("userId", userId))
      .first();

    if (session) {
      await ctx.db.patch(session._id, {
        lastHeartbeat: Date.now(),
        isActive: true, // Ensure session is active
      });
    }
  },
});

/**
 * Get all active users on a board (real-time!)
 */
export const getActiveUsers = query({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    return await getActiveUsersInternal(ctx, args.boardId);
  },
});

/**
 * Get all cursor positions for active users (real-time!)
 */
export const getCursors = query({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const activeUsers = await getActiveUsersInternal(ctx, args.boardId);

    // Assign colors to users (deterministic based on userId)
    const colors = [
      "#4a90e2", // Blue
      "#e24a4a", // Red
      "#4ae24a", // Green
      "#e2e24a", // Yellow
      "#e24ae2", // Purple
      "#4ae2e2", // Cyan
      "#e2904a", // Orange
    ];

    return activeUsers.map((user: Doc<"collaborationSessions">, index: number) => ({
      userId: user.userId,
      userName: user.userName,
      userPhotoUrl: user.userPhotoUrl,
      cursorX: user.cursorX || 0,
      cursorY: user.cursorY || 0,
      color: colors[index % colors.length],
      isActive: user.isActive,
      lastHeartbeat: user.lastHeartbeat,
    }));
  },
});

/**
 * Get collaboration statistics for a board
 */
export const getStats = query({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const activeUsers = await getActiveUsersInternal(ctx, args.boardId);

    // Get all-time collaboration sessions for this board
    const allSessions = await ctx.db
      .query("collaborationSessions")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    return {
      activeCount: activeUsers.length,
      totalCollaborators: new Set(allSessions.map((s) => s.userId)).size,
      currentSessions: activeUsers.map((u: Doc<"collaborationSessions">) => ({
        userName: u.userName,
        joinedAt: u.joinedAt,
        lastActivity: u.lastHeartbeat,
      })),
    };
  },
});

/**
 * Cleanup stale sessions (called by scheduled function)
 * This can be run periodically to clean up old sessions
 */
export const cleanupStaleSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    // Get all active sessions (no index - scanning all sessions)
    const allSessions = await ctx.db.query("collaborationSessions").collect();
    const sessions = allSessions.filter((s) => s.isActive);

    let cleanedCount = 0;

    // Mark stale sessions as inactive
    for (const session of sessions) {
      if (now - session.lastHeartbeat >= staleThreshold) {
        await ctx.db.patch(session._id, { isActive: false });
        cleanedCount++;
      }
    }

    return { cleanedCount, totalSessions: sessions.length };
  },
});

// =========================================================================
// COLLABORATIVE ROOM STORAGE (Replaces Firebase Firestore "scenes")
// =========================================================================

/**
 * Save collaborative scene to Convex
 * Replaces Firebase's saveToFirebase() function
 */
export const saveCollaborativeScene = mutation({
  args: {
    roomId: v.string(),
    ciphertext: v.bytes(), // Encrypted scene data
    iv: v.bytes(), // Encryption IV
    sceneVersion: v.number(),
    lastEditedBy: v.optional(v.string()), // Optional Clerk user ID
  },
  handler: async (ctx, args) => {
    // Check if room already exists
    const existingRoom = await ctx.db
      .query("collaborativeRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days from now

    if (existingRoom) {
      // Update existing room
      await ctx.db.patch(existingRoom._id, {
        ciphertext: args.ciphertext,
        iv: args.iv,
        sceneVersion: args.sceneVersion,
        updatedAt: now,
        lastEditedBy: args.lastEditedBy,
        expiresAt, // Reset expiry on update
      });

      return { success: true, roomId: args.roomId, version: args.sceneVersion };
    } else {
      // Create new room
      await ctx.db.insert("collaborativeRooms", {
        roomId: args.roomId,
        ciphertext: args.ciphertext,
        iv: args.iv,
        sceneVersion: args.sceneVersion,
        createdAt: now,
        updatedAt: now,
        lastEditedBy: args.lastEditedBy,
        expiresAt,
      });

      return { success: true, roomId: args.roomId, version: args.sceneVersion };
    }
  },
});

/**
 * Load collaborative scene from Convex
 * Replaces Firebase's loadFromFirebase() function
 */
export const loadCollaborativeScene = query({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("collaborativeRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) {
      return null; // Room doesn't exist yet
    }

    return {
      ciphertext: room.ciphertext,
      iv: room.iv,
      sceneVersion: room.sceneVersion,
      updatedAt: room.updatedAt,
    };
  },
});

/**
 * Check if room exists (for initialization logic)
 */
export const roomExists = query({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("collaborativeRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    return room !== null;
  },
});

/**
 * Get room info (metadata only, no encrypted data)
 */
export const getRoomInfo = query({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("collaborativeRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) {
      return null;
    }

    return {
      roomId: room.roomId,
      sceneVersion: room.sceneVersion,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      lastEditedBy: room.lastEditedBy,
    };
  },
});
