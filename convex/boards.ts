/**
 * Convex Queries and Mutations for Boards
 *
 * This file contains all board-related database operations.
 * Files are stored in Firebase Storage, only metadata + URLs are in Convex.
 */

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

// Shared validator for board document shape
const boardValidator = v.object({
  _id: v.id("boards"),
  _creationTime: v.number(),
  name: v.string(),
  thumbnailUrl: v.optional(v.string()),
  workspaceId: v.id("workspaces"),
  projectId: v.optional(v.id("projects")),
  ownerId: v.string(),
  isPublic: v.boolean(),
  publicLinkId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  lastOpenedAt: v.number(),
  archivedAt: v.optional(v.number()),
  version: v.number(),
});

// Shared validator for board content shape
const boardContentValidator = v.object({
  boardId: v.id("boards"),
  ciphertext: v.bytes(),
  iv: v.bytes(),
  version: v.number(),
  updatedAt: v.number(),
  updatedBy: v.string(),
  checksum: v.string(),
});

// =========================================================================
// AUTH HELPERS
// =========================================================================

/**
 * Assert that the current user has access to a board.
 * Checks: board owner, workspace member, or direct board collaborator.
 * Returns the board document if access is granted.
 */
async function assertBoardAccess(
  ctx: QueryCtx | MutationCtx,
  boardId: Id<"boards">,
  requiredRole?: "owner" | "editor",
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }

  const board = await ctx.db.get(boardId);
  if (!board) {
    throw new Error("Board not found");
  }

  const userId = identity.subject;

  // Owner always has full access
  if (board.ownerId === userId) {
    return { board, identity, role: "owner" as const };
  }

  // Check workspace membership
  const workspaceMember = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_and_user", (q) =>
      q.eq("workspaceId", board.workspaceId).eq("userId", userId),
    )
    .first();

  if (workspaceMember) {
    // For owner-only operations, workspace admins also qualify
    if (
      requiredRole === "owner" &&
      !["owner", "admin"].includes(workspaceMember.role)
    ) {
      throw new Error("Access denied: requires owner or admin role");
    }
    return { board, identity, role: workspaceMember.role };
  }

  // Check board-level collaborator
  const boardCollaborator = await ctx.db
    .query("boardCollaborators")
    .withIndex("by_board_and_user", (q) =>
      q.eq("boardId", boardId).eq("userId", userId),
    )
    .first();

  if (boardCollaborator) {
    if (requiredRole === "owner") {
      throw new Error("Access denied: requires owner or admin role");
    }
    if (requiredRole === "editor" && boardCollaborator.role !== "editor") {
      throw new Error("Access denied: requires editor role");
    }
    return { board, identity, role: boardCollaborator.role };
  }

  throw new Error("Access denied");
}

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
  returns: v.array(boardValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Verify user has access to the workspace
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const hasAccess =
      workspace.ownerId === identity.subject ||
      (await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("userId", identity.subject),
        )
        .first()) !== null;

    if (!hasAccess) {
      throw new Error("Access denied");
    }

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
  returns: v.array(boardValidator),
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
  returns: boardValidator,
  handler: async (ctx, args) => {
    const { board } = await assertBoardAccess(ctx, args.boardId);
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
  returns: boardContentValidator,
  handler: async (ctx, args) => {
    const { identity } = await assertBoardAccess(ctx, args.boardId);

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

    return {
      boardId: content.boardId,
      ciphertext: content.ciphertext,
      iv: content.iv,
      version: content.version,
      updatedAt: content.updatedAt,
      updatedBy: content.updatedBy,
      checksum: content.checksum,
    };
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
  returns: v.id("boards"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Verify user is a member of the workspace
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const hasAccess =
      workspace.ownerId === identity.subject ||
      (await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("userId", identity.subject),
        )
        .first()) !== null;

    if (!hasAccess) {
      throw new Error("Access denied");
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
  returns: v.id("boards"),
  handler: async (ctx, args) => {
    await assertBoardAccess(ctx, args.boardId, "editor");

    const { boardId, ...updates } = args;

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
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertBoardAccess(ctx, args.boardId);

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
  returns: v.number(),
  handler: async (ctx, args) => {
    const { identity } = await assertBoardAccess(ctx, args.boardId, "editor");

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
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertBoardAccess(ctx, args.boardId, "owner");

    await ctx.db.patch(args.boardId, {
      archivedAt: Date.now(),
    });
  },
});

/**
 * Permanently delete a board and all related data.
 * Cannot delete the last board in a workspace.
 */
export const permanentDelete = mutation({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { board } = await assertBoardAccess(ctx, args.boardId, "owner");

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

    // Delete content
    const content = await ctx.db
      .query("boardContent")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .first();
    if (content) {
      await ctx.db.delete(content._id);
    }

    // Delete versions
    const versions = await ctx.db
      .query("boardVersions")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    for (const ver of versions) {
      await ctx.db.delete(ver._id);
    }

    // Delete collaborators
    const collabs = await ctx.db
      .query("boardCollaborators")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    for (const c of collabs) {
      await ctx.db.delete(c._id);
    }

    // Delete files metadata
    const files = await ctx.db
      .query("files")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    for (const f of files) {
      await ctx.db.delete(f._id);
    }

    // Delete collaboration sessions
    const sessions = await ctx.db
      .query("collaborationSessions")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }

    // Delete board
    await ctx.db.delete(args.boardId);

    // Note: Firebase Storage files should be deleted separately
    // via a backend function or cleanup job
  },
});
