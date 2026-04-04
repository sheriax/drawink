/**
 * Convex Queries and Mutations for Projects (Folders)
 *
 * Projects allow users to organize boards into folders within a workspace.
 */

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

// Shared validator for project document shape
const projectValidator = v.object({
  _id: v.id("projects"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  color: v.optional(v.string()),
  icon: v.optional(v.string()),
  workspaceId: v.id("workspaces"),
  ownerId: v.string(),
  parentProjectId: v.optional(v.id("projects")),
  createdAt: v.number(),
  updatedAt: v.number(),
  archivedAt: v.optional(v.number()),
});

// =========================================================================
// AUTH HELPERS
// =========================================================================

async function assertWorkspaceAccess(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }

  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const userId = identity.subject;

  if (workspace.ownerId === userId) {
    return { workspace, identity, role: "owner" as const };
  }

  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_and_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId),
    )
    .first();

  if (!membership) {
    throw new Error("Access denied");
  }

  return { workspace, identity, role: membership.role };
}

// =========================================================================
// QUERIES
// =========================================================================

/**
 * Get all non-archived projects in a workspace
 */
export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.array(projectValidator),
  handler: async (ctx, args) => {
    await assertWorkspaceAccess(ctx, args.workspaceId);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workspace_not_archived", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("archivedAt", undefined),
      )
      .collect();

    return projects;
  },
});

/**
 * Get a single project by ID
 */
export const getById = query({
  args: {
    projectId: v.id("projects"),
  },
  returns: projectValidator,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    await assertWorkspaceAccess(ctx, project.workspaceId);

    return project;
  },
});

// =========================================================================
// MUTATIONS
// =========================================================================

/**
 * Create a new project in a workspace
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    parentProjectId: v.optional(v.id("projects")),
  },
  returns: v.id("projects"),
  handler: async (ctx, args) => {
    const { identity } = await assertWorkspaceAccess(ctx, args.workspaceId);

    const now = Date.now();

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      color: args.color,
      icon: args.icon,
      workspaceId: args.workspaceId,
      ownerId: identity.subject,
      parentProjectId: args.parentProjectId,
      createdAt: now,
      updatedAt: now,
    });

    return projectId;
  },
});

/**
 * Update project metadata
 */
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  returns: v.id("projects"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const { role } = await assertWorkspaceAccess(ctx, project.workspaceId);
    if (!["owner", "admin"].includes(role) && project.ownerId !== identity.subject) {
      throw new Error("Access denied: requires owner or admin role");
    }

    const { projectId, ...updates } = args;

    await ctx.db.patch(projectId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return projectId;
  },
});

/**
 * Archive a project (soft delete). Disassociates all boards from the project.
 */
export const archive = mutation({
  args: {
    projectId: v.id("projects"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const { role } = await assertWorkspaceAccess(ctx, project.workspaceId);
    if (!["owner", "admin"].includes(role) && project.ownerId !== identity.subject) {
      throw new Error("Access denied");
    }

    // Disassociate all boards from this project
    const boards = await ctx.db
      .query("boards")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const board of boards) {
      await ctx.db.patch(board._id, { projectId: undefined, updatedAt: Date.now() });
    }

    await ctx.db.patch(args.projectId, {
      archivedAt: Date.now(),
    });
  },
});

/**
 * Permanently delete a project. Disassociates all boards first.
 */
export const permanentDelete = mutation({
  args: {
    projectId: v.id("projects"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const { role } = await assertWorkspaceAccess(ctx, project.workspaceId);
    if (!["owner", "admin"].includes(role) && project.ownerId !== identity.subject) {
      throw new Error("Access denied");
    }

    // Disassociate all boards from this project
    const boards = await ctx.db
      .query("boards")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const board of boards) {
      await ctx.db.patch(board._id, { projectId: undefined, updatedAt: Date.now() });
    }

    await ctx.db.delete(args.projectId);
  },
});
