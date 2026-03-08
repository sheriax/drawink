/**
 * Convex User Management (synced from Clerk)
 *
 * Users are created/updated via Clerk webhook
 * This file contains queries for user data
 */

import { v } from "convex/values";
import {
  type MutationCtx,
  type QueryCtx,
  internalMutation,
  query,
} from "./_generated/server";

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Get the current user's ID from auth identity
 * Throws error if user is not authenticated
 */
export async function getUserId(ctx: MutationCtx | QueryCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: User not authenticated");
  }
  return identity.subject; // Clerk user ID
}

// =========================================================================
// QUERIES
// =========================================================================

/**
 * Get current user
 */
export const getCurrent = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      clerkId: v.string(),
      email: v.string(),
      name: v.string(),
      photoUrl: v.optional(v.string()),
      subscriptionTier: v.union(v.literal("free"), v.literal("pro"), v.literal("team")),
      stripeCustomerId: v.optional(v.string()),
      stripeSubscriptionId: v.optional(v.string()),
      subscriptionExpiresAt: v.optional(v.number()),
      createdAt: v.number(),
      lastLoginAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user;
  },
});

/**
 * Get user by Clerk ID
 * Requires authentication; strips sensitive Stripe fields from response.
 */
export const getByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      clerkId: v.string(),
      email: v.string(),
      name: v.string(),
      photoUrl: v.optional(v.string()),
      subscriptionTier: v.union(v.literal("free"), v.literal("pro"), v.literal("team")),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return null;
    }

    // Strip sensitive Stripe IDs from response
    return {
      _id: user._id,
      _creationTime: user._creationTime,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      photoUrl: user.photoUrl,
      subscriptionTier: user.subscriptionTier,
    };
  },
});

// =========================================================================
// INTERNAL MUTATIONS (Called by Clerk/Stripe webhooks via httpAction)
// =========================================================================

/**
 * Create or update user from Clerk webhook
 * This is called automatically when user signs up/updates profile
 */
export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const now = Date.now();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        photoUrl: args.photoUrl,
        lastLoginAt: now,
      });

      return existingUser._id;
    } else {
      // Create new user
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        photoUrl: args.photoUrl,
        subscriptionTier: "team",
        createdAt: now,
        lastLoginAt: now,
      });

      return userId;
    }
  },
});

/**
 * Update user subscription (called by Stripe webhook)
 */
export const updateSubscription = internalMutation({
  args: {
    clerkId: v.string(),
    tier: v.union(v.literal("free"), v.literal("pro"), v.literal("team")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      subscriptionTier: args.tier,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionExpiresAt: args.expiresAt,
    });
  },
});

/**
 * Delete user from Clerk webhook (user.deleted event).
 * Removes the user record and cleans up workspace memberships.
 */
export const deleteFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      // Already deleted or never existed — idempotent
      return;
    }

    // Remove workspace memberships (not owned workspaces — those stay)
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.clerkId))
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    // Remove board collaborator entries
    const collaborations = await ctx.db
      .query("boardCollaborators")
      .withIndex("by_user", (q) => q.eq("userId", args.clerkId))
      .collect();

    for (const collab of collaborations) {
      await ctx.db.delete(collab._id);
    }

    // Delete the user record
    await ctx.db.delete(user._id);
  },
});
