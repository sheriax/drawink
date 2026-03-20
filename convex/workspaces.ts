/**
 * Convex Queries and Mutations for Workspaces
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Shared validator for workspace document shape
const workspaceValidator = v.object({
  _id: v.id("workspaces"),
  _creationTime: v.number(),
  name: v.string(),
  ownerId: v.string(),
  clerkOrgId: v.optional(v.string()),
  icon: v.optional(v.string()),
  color: v.optional(v.string()),
  subscriptionTier: v.union(v.literal("free"), v.literal("pro"), v.literal("team")),
  createdAt: v.number(),
  updatedAt: v.number(),
  memberCount: v.number(),
});

// Shared validator for member with user details
const memberWithUserValidator = v.object({
  _id: v.id("workspaceMembers"),
  _creationTime: v.number(),
  workspaceId: v.id("workspaces"),
  userId: v.string(),
  role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member"), v.literal("viewer")),
  joinedAt: v.number(),
  user: v.union(
    v.object({
      _id: v.id("users"),
      clerkId: v.string(),
      name: v.string(),
      email: v.string(),
      photoUrl: v.optional(v.string()),
    }),
    v.null(),
  ),
});

// =========================================================================
// QUERIES
// =========================================================================

/**
 * Get all workspaces for the current user
 */
export const listMine = query({
  args: {},
  returns: v.array(workspaceValidator),
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

    // Combine and deduplicate (owner is also a member)
    const seen = new Set(ownedWorkspaces.map((w) => w._id));
    const unique = [...ownedWorkspaces];
    for (const w of memberWorkspaces) {
      if (w && !seen.has(w._id)) {
        seen.add(w._id);
        unique.push(w);
      }
    }

    return unique;
  },
});

/**
 * Get a single workspace by ID
 */
export const getById = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: workspaceValidator,
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
  returns: v.array(memberWithUserValidator),
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

    // Verify caller is a member of the workspace
    const callerMembership =
      workspace.ownerId === identity.subject ||
      (await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("userId", identity.subject),
        )
        .first()) !== null;

    if (!callerMembership) {
      throw new Error("Access denied: not a workspace member");
    }

    // Get members
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Get user details — return only non-sensitive fields
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", member.userId))
          .first();

        return {
          ...member,
          user: user
            ? {
                _id: user._id,
                clerkId: user.clerkId,
                name: user.name,
                email: user.email,
                photoUrl: user.photoUrl,
              }
            : null,
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
  returns: v.id("workspaces"),
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

    // Create default board for the workspace
    await ctx.db.insert("boards", {
      name: "Untitled Board",
      workspaceId,
      ownerId: identity.subject,
      isPublic: false,
      version: 0,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
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
  returns: v.id("workspaces"),
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

    // Validate icon (emoji, max 8 chars)
    if (updates.icon !== undefined && updates.icon.length > 8) {
      throw new Error("Icon must be 8 characters or fewer");
    }

    // Validate color (hex format)
    if (updates.color !== undefined && !/^#[0-9a-fA-F]{3,8}$/.test(updates.color)) {
      throw new Error("Color must be a valid hex color (e.g. #FF5733)");
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
  returns: v.id("workspaces"),
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

    // Create default board for the workspace
    await ctx.db.insert("boards", {
      name: "Untitled Board",
      workspaceId,
      ownerId: identity.subject,
      isPublic: false,
      version: 0,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
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
  returns: v.null(),
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

    // Safety check: reject very large workspaces to avoid mutation timeout
    if (boards.length > 50) {
      throw new Error(
        "Workspace has too many boards for direct deletion. Please delete boards individually first.",
      );
    }

    // For each board, delete all related data in a single pass
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

      const sessions = await ctx.db
        .query("collaborationSessions")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      for (const s of sessions) {
        await ctx.db.delete(s._id);
      }

      await ctx.db.delete(board._id);
    }

    // Delete all projects in this workspace
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const p of projects) {
      await ctx.db.delete(p._id);
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
    return null;
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
  returns: v.id("workspaces"),
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

/**
 * Remove a member from a workspace.
 * Owner/admin can remove members. Members can remove themselves (leave).
 * Cannot remove the workspace owner.
 */
export const removeMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.string(), // Clerk user ID of the member to remove
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Cannot remove the workspace owner
    if (args.userId === workspace.ownerId) {
      throw new Error("Cannot remove the workspace owner. Transfer ownership first.");
    }

    const isSelfRemoval = args.userId === identity.subject;

    if (!isSelfRemoval) {
      // Only owner/admin can remove others
      const callerMembership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("userId", identity.subject),
        )
        .first();

      const isOwner = workspace.ownerId === identity.subject;
      const isAdmin = callerMembership?.role === "admin";

      if (!isOwner && !isAdmin) {
        throw new Error("Access denied: only owner or admin can remove members");
      }
    }

    // Find and delete the membership
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId),
      )
      .first();

    if (!membership) {
      throw new Error("Member not found in workspace");
    }

    await ctx.db.delete(membership._id);

    // Update member count
    await ctx.db.patch(args.workspaceId, {
      memberCount: Math.max(1, workspace.memberCount - 1),
      updatedAt: Date.now(),
    });

    return null;
  },
});
