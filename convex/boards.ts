/**
 * Convex Queries and Mutations for Boards
 *
 * This file contains all board-related database operations.
 * Files are stored in Firebase Storage, only metadata + URLs are in Convex.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// =========================================================================
// QUERIES (Real-time reactive data)
// =========================================================================

/**
 * Get all boards in a workspace (not archived)
 */
export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    // Check authentication (Clerk integration)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // TODO: Check if user has access to workspace
    // For now, just return boards

    const boards = await ctx.db
      .query("boards")
      .withIndex("by_workspace_not_archived", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("archivedAt", undefined),
      )
      .order("desc")
      .collect();

    return boards;
  },
});

/**
 * Get recent boards for a workspace
 */
export const listRecent = query({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const boards = await ctx.db
      .query("boards")
      .withIndex("by_workspace_recent", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(args.limit || 10);

    return boards.filter((b) => !b.archivedAt);
  },
});

/**
 * Get a single board by ID
 */
export const getById = query({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // TODO: Check if user has access to this board

    return board;
  },
});

/**
 * Get board content (encrypted elements + appState)
 */
export const getContent = query({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Check board exists and user has access
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Get content
    const content = await ctx.db
      .query("boardContent")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .first();

    if (!content) {
      // Return empty content if none exists yet
      return {
        boardId: args.boardId,
        ciphertext: new ArrayBuffer(0),
        iv: new ArrayBuffer(0),
        version: 0,
        updatedAt: Date.now(),
        updatedBy: identity.subject,
        checksum: "",
      };
    }

    return content;
  },
});

// =========================================================================
// MUTATIONS (Write operations)
// =========================================================================

/**
 * Create a new board
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();

    const boardId = await ctx.db.insert("boards", {
      name: args.name,
      workspaceId: args.workspaceId,
      projectId: args.projectId,
      ownerId: identity.subject,
      isPublic: false,
      version: 0,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
    });

    return boardId;
  },
});

/**
 * Update board metadata
 */
export const update = mutation({
  args: {
    boardId: v.id("boards"),
    name: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const { boardId, ...updates } = args;

    // Check board exists
    const board = await ctx.db.get(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // TODO: Check if user has edit permission

    await ctx.db.patch(boardId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return boardId;
  },
});

/**
 * Update last opened timestamp
 */
export const updateLastOpened = mutation({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.boardId, {
      lastOpenedAt: Date.now(),
    });
  },
});

/**
 * Save board content (encrypted elements + appState)
 */
export const saveContent = mutation({
  args: {
    boardId: v.id("boards"),
    ciphertext: v.bytes(),
    iv: v.bytes(),
    checksum: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Check board exists
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Get current content
    const existingContent = await ctx.db
      .query("boardContent")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .first();

    const now = Date.now();
    const newVersion = existingContent ? existingContent.version + 1 : 1;

    if (existingContent) {
      // Update existing content
      await ctx.db.patch(existingContent._id, {
        ciphertext: args.ciphertext,
        iv: args.iv,
        checksum: args.checksum,
        version: newVersion,
        updatedAt: now,
        updatedBy: identity.subject,
      });
    } else {
      // Create new content document
      await ctx.db.insert("boardContent", {
        boardId: args.boardId,
        ciphertext: args.ciphertext,
        iv: args.iv,
        checksum: args.checksum,
        version: newVersion,
        updatedAt: now,
        updatedBy: identity.subject,
      });
    }

    // Update board's updatedAt and version
    await ctx.db.patch(args.boardId, {
      updatedAt: now,
      version: newVersion,
    });

    return newVersion;
  },
});

/**
 * Archive a board (soft delete)
 */
export const archive = mutation({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // TODO: Check if user has delete permission

    await ctx.db.patch(args.boardId, {
      archivedAt: Date.now(),
    });
  },
});

/**
 * Permanently delete a board and its content.
 * Cannot delete the last board in a workspace.
 */
export const permanentDelete = mutation({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check if this is the last board in the workspace
    const boardsInWorkspace = await ctx.db
      .query("boards")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", board.workspaceId))
      .collect();

    // Filter out archived boards
    const activeBoards = boardsInWorkspace.filter((b) => !b.archivedAt);

    if (activeBoards.length <= 1) {
      throw new Error(
        "Cannot delete the last board in a workspace. Each workspace must have at least one board.",
      );
    }

    // TODO: Check if user is owner

    // Delete content
    const content = await ctx.db
      .query("boardContent")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .first();
    if (content) {
      await ctx.db.delete(content._id);
    }

    // Delete board
    await ctx.db.delete(args.boardId);

    // Note: Firebase Storage files should be deleted separately
    // via a backend function or cleanup job
  },
});
