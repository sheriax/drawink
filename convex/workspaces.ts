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
