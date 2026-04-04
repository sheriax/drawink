/**
 * Convex Queries and Mutations for Templates
 *
 * Templates allow users to create boards from pre-made layouts.
 * Built-in templates are available to all users.
 * Custom templates can be created by Pro/Team users.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserId } from "./users";

// Shared validator for template document shape
const templateValidator = v.object({
  _id: v.id("templates"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  category: v.string(),
  thumbnailUrl: v.optional(v.string()),
  ciphertext: v.bytes(),
  iv: v.bytes(),
  isBuiltIn: v.boolean(),
  workspaceId: v.optional(v.id("workspaces")),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  usageCount: v.number(),
});

// Template metadata (without encrypted content)
const templateMetaValidator = v.object({
  _id: v.id("templates"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  category: v.string(),
  thumbnailUrl: v.optional(v.string()),
  isBuiltIn: v.boolean(),
  workspaceId: v.optional(v.id("workspaces")),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  usageCount: v.number(),
});

// =========================================================================
// QUERIES
// =========================================================================

/**
 * Get all built-in templates (available to all users)
 */
export const listBuiltIn = query({
  args: {},
  returns: v.array(templateMetaValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const templates = await ctx.db
      .query("templates")
      .withIndex("by_built_in", (q) => q.eq("isBuiltIn", true))
      .collect();

    return templates.map(({ ciphertext, iv, ...meta }) => meta);
  },
});

/**
 * Get templates in a category, sorted by popularity
 */
export const listByCategory = query({
  args: {
    category: v.string(),
  },
  returns: v.array(templateMetaValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const templates = await ctx.db
      .query("templates")
      .withIndex("by_category_and_usage", (q) => q.eq("category", args.category))
      .order("desc")
      .collect();

    return templates.map(({ ciphertext, iv, ...meta }) => meta);
  },
});

/**
 * Get distinct category names from all templates
 */
export const listCategories = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const templates = await ctx.db
      .query("templates")
      .collect();

    const categories = [...new Set(templates.map((t) => t.category))];
    return categories.sort();
  },
});

/**
 * Get user-created templates for a workspace
 */
export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.array(templateMetaValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const templates = await ctx.db
      .query("templates")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    return templates.map(({ ciphertext, iv, ...meta }) => meta);
  },
});

/**
 * Get encrypted template content (for copying into a new board)
 */
export const getContent = query({
  args: {
    templateId: v.id("templates"),
  },
  returns: v.object({
    ciphertext: v.bytes(),
    iv: v.bytes(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    return {
      ciphertext: template.ciphertext,
      iv: template.iv,
    };
  },
});

// =========================================================================
// MUTATIONS
// =========================================================================

/**
 * Create a custom template from a board
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    thumbnailUrl: v.optional(v.string()),
    ciphertext: v.bytes(),
    iv: v.bytes(),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.id("templates"),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    const templateId = await ctx.db.insert("templates", {
      name: args.name,
      description: args.description,
      category: args.category,
      thumbnailUrl: args.thumbnailUrl,
      ciphertext: args.ciphertext,
      iv: args.iv,
      isBuiltIn: false,
      workspaceId: args.workspaceId,
      createdBy: userId,
      createdAt: Date.now(),
      usageCount: 0,
    });

    return templateId;
  },
});

/**
 * Increment template usage counter (called when creating a board from template)
 */
export const incrementUsage = mutation({
  args: {
    templateId: v.id("templates"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await ctx.db.patch(args.templateId, {
      usageCount: template.usageCount + 1,
    });
  },
});
