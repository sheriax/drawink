/**
 * Convex Queries and Mutations for Workspaces
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// =========================================================================
// QUERIES
// =========================================================================

/**
 * Get all workspaces for the current user
 */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Get workspaces where user is owner
    const ownedWorkspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .collect();

    // Get workspaces where user is a member
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const memberWorkspaceIds = memberships.map((m) => m.workspaceId);
    const memberWorkspaces = await Promise.all(memberWorkspaceIds.map((id) => ctx.db.get(id)));

    // Combine and deduplicate
    const allWorkspaces = [...ownedWorkspaces, ...memberWorkspaces.filter((w) => w !== null)];

    return allWorkspaces;
  },
});

/**
 * Get a single workspace by ID
 */
export const getById = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Check if user has access
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

    return workspace;
  },
});

/**
 * Get workspace members
 */
export const getMembers = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Check access to workspace
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Get members
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Get user details for each member
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", member.userId))
          .first();

        return {
          ...member,
          user: user || null,
        };
      }),
    );

    return membersWithDetails;
  },
});

// =========================================================================
// MUTATIONS
// =========================================================================

/**
 * Create a new workspace
 */
export const create = mutation({
  args: {
    name: v.string(),
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      ownerId: identity.subject,
      clerkOrgId: args.clerkOrgId,
      subscriptionTier: "team",
      createdAt: now,
      updatedAt: now,
      memberCount: 1,
    });

    // Add creator as owner member
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId: identity.subject,
      role: "owner",
      joinedAt: now,
    });

    return workspaceId;
  },
});

/**
 * Update workspace
 */
export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const { workspaceId, ...updates } = args;

    // Check if user is owner or admin
    const member = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", workspaceId).eq("userId", identity.subject),
      )
      .first();

    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(workspaceId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return workspaceId;
  },
});

/**
 * Ensure default workspace exists for user
 */
export const ensureDefault = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Check if user has any workspace
    const existingWorkspace = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .first();

    if (existingWorkspace) {
      return existingWorkspace._id;
    }

    // Create default workspace
    const now = Date.now();
    const workspaceId = await ctx.db.insert("workspaces", {
      name: "My Workspace",
      ownerId: identity.subject,
      subscriptionTier: "team",
      createdAt: now,
      updatedAt: now,
      memberCount: 1,
    });

    // Add creator as owner member
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId: identity.subject,
      role: "owner",
      joinedAt: now,
    });

    return workspaceId;
  },
});

/**
 * Delete a workspace and all its boards (cascade).
 * Owner-only. Requires confirmName to match workspace name.
 */
export const deleteWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    confirmName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    if (workspace.ownerId !== identity.subject) {
      throw new Error("Only the workspace owner can delete it");
    }

    if (args.confirmName !== workspace.name) {
      throw new Error("Workspace name does not match");
    }

    // Get all boards in this workspace
    const boards = await ctx.db
      .query("boards")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // For each board, delete related data
    for (const board of boards) {
      const contents = await ctx.db
        .query("boardContent")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      for (const c of contents) {
        await ctx.db.delete(c._id);
      }

      const versions = await ctx.db
        .query("boardVersions")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      for (const ver of versions) {
        await ctx.db.delete(ver._id);
      }

      const collabs = await ctx.db
        .query("boardCollaborators")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      for (const c of collabs) {
        await ctx.db.delete(c._id);
      }

      const files = await ctx.db
        .query("files")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      for (const f of files) {
        await ctx.db.delete(f._id);
      }

      await ctx.db.delete(board._id);
    }

    // Delete all workspace members
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const m of members) {
      await ctx.db.delete(m._id);
    }

    // Delete the workspace
    await ctx.db.delete(args.workspaceId);
  },
});

/**
 * Transfer workspace ownership to another member.
 * Current owner becomes admin.
 */
export const transferOwnership = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    newOwnerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    if (workspace.ownerId !== identity.subject) {
      throw new Error("Only the workspace owner can transfer ownership");
    }

    if (args.newOwnerUserId === identity.subject) {
      throw new Error("Cannot transfer ownership to yourself");
    }

    const newOwnerMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.newOwnerUserId),
      )
      .first();

    if (!newOwnerMembership) {
      throw new Error("New owner must be a workspace member");
    }

    await ctx.db.patch(args.workspaceId, {
      ownerId: args.newOwnerUserId,
      updatedAt: Date.now(),
    });

    const currentOwnerMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", identity.subject),
      )
      .first();

    if (currentOwnerMembership) {
      await ctx.db.patch(currentOwnerMembership._id, { role: "admin" });
    }

    await ctx.db.patch(newOwnerMembership._id, { role: "owner" });

    return args.workspaceId;
  },
});
