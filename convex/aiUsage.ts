/**
 * Convex AI Usage Tracking
 *
 * Tracks AI feature usage per user for tier-based limits.
 * Free tier: 30 requests/month. Pro/Team/Beta: unlimited.
 */

import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getUserId } from "./users";

// =========================================================================
// TIER LIMITS
// =========================================================================

const TIER_LIMITS: Record<string, { monthlyRequests: number }> = {
  free: { monthlyRequests: 30 },
  pro: { monthlyRequests: Infinity },
  team: { monthlyRequests: Infinity },
};

// =========================================================================
// HELPERS
// =========================================================================

/**
 * Get the current month string in "YYYY-MM" format.
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Get the start of today in milliseconds (UTC).
 */
function getStartOfTodayMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

// =========================================================================
// QUERIES
// =========================================================================

/**
 * Get current AI usage for the authenticated user.
 * Returns daily and monthly usage counts with reset handling.
 */
export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { dailyTokensUsed: 0, monthlyTokensUsed: 0 };
    }
    const userId = identity.subject;

    const usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!usage) {
      return {
        dailyTokensUsed: 0,
        monthlyTokensUsed: 0,
      };
    }

    const currentMonth = getCurrentMonth();
    const startOfToday = getStartOfTodayMs();

    // Check if daily counter needs logical reset
    const dailyTokensUsed =
      usage.lastDailyReset < startOfToday ? 0 : usage.dailyTokensUsed;

    // Check if monthly counter needs logical reset
    const monthlyTokensUsed =
      usage.lastMonthlyReset !== currentMonth ? 0 : usage.monthlyTokensUsed;

    return {
      dailyTokensUsed,
      monthlyTokensUsed,
    };
  },
});

/**
 * Check if the authenticated user can make an AI request.
 * Returns { allowed, reason, remaining }.
 */
export const checkLimit = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { allowed: false, reason: "Not authenticated", remaining: 0 };
    }
    const userId = identity.subject;

    // Get user's subscription tier
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
      .first();

    if (!user) {
      return { allowed: false, reason: "User not found", remaining: 0 };
    }

    // Beta users always have unlimited access
    if (user.isBetaUser) {
      return { allowed: true, reason: null, remaining: Infinity };
    }

    const tier = user.subscriptionTier;
    const limit = TIER_LIMITS[tier]?.monthlyRequests ?? 0;

    if (limit === Infinity) {
      return { allowed: true, reason: null, remaining: Infinity };
    }

    // Get current usage
    const usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const currentMonth = getCurrentMonth();
    const monthlyUsed =
      usage && usage.lastMonthlyReset === currentMonth
        ? usage.monthlyTokensUsed
        : 0;

    const remaining = Math.max(0, limit - monthlyUsed);

    if (remaining <= 0) {
      return {
        allowed: false,
        reason: "Monthly AI request limit reached. Upgrade to Pro for unlimited access.",
        remaining: 0,
      };
    }

    return { allowed: true, reason: null, remaining };
  },
});

// =========================================================================
// MUTATIONS
// =========================================================================

/**
 * Track an AI request. Increments daily and monthly counters.
 * Handles counter resets when the day/month rolls over.
 */
/**
 * Internal version of trackUsage — callable from Convex actions via ctx.runMutation(internal.*).
 * Takes userId directly instead of reading from auth context.
 */
export const trackUsageInternal = internalMutation({
  args: {
    userId: v.string(),
    feature: v.string(),
    tokensUsed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tokens = args.tokensUsed ?? 1;
    const now = Date.now();
    const currentMonth = getCurrentMonth();
    const startOfToday = getStartOfTodayMs();

    const existing = await ctx.db
      .query("aiUsage")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      const dailyTokens =
        existing.lastDailyReset < startOfToday
          ? tokens
          : existing.dailyTokensUsed + tokens;
      const monthlyTokens =
        existing.lastMonthlyReset !== currentMonth
          ? tokens
          : existing.monthlyTokensUsed + tokens;

      await ctx.db.patch(existing._id, {
        dailyTokensUsed: dailyTokens,
        monthlyTokensUsed: monthlyTokens,
        lastDailyReset: existing.lastDailyReset < startOfToday ? startOfToday : existing.lastDailyReset,
        lastMonthlyReset: currentMonth,
      });
    } else {
      await ctx.db.insert("aiUsage", {
        userId: args.userId,
        dailyTokensUsed: tokens,
        monthlyTokensUsed: tokens,
        lastDailyReset: startOfToday,
        lastMonthlyReset: currentMonth,
      });
    }
  },
});

export const trackUsage = mutation({
  args: {
    feature: v.string(), // "text-to-diagram", "diagram-to-code", etc.
    tokensUsed: v.optional(v.number()), // Optional token count (defaults to 1)
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const tokens = args.tokensUsed ?? 1;
    const now = Date.now();
    const currentMonth = getCurrentMonth();
    const startOfToday = getStartOfTodayMs();

    const existing = await ctx.db
      .query("aiUsage")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      // Reset daily counter if new day
      const dailyTokens =
        existing.lastDailyReset < startOfToday
          ? tokens
          : existing.dailyTokensUsed + tokens;

      // Reset monthly counter if new month
      const monthlyTokens =
        existing.lastMonthlyReset !== currentMonth
          ? tokens
          : existing.monthlyTokensUsed + tokens;

      await ctx.db.patch(existing._id, {
        dailyTokensUsed: dailyTokens,
        monthlyTokensUsed: monthlyTokens,
        lastDailyReset: existing.lastDailyReset < startOfToday ? startOfToday : existing.lastDailyReset,
        lastMonthlyReset: currentMonth,
      });
    } else {
      await ctx.db.insert("aiUsage", {
        userId,
        dailyTokensUsed: tokens,
        monthlyTokensUsed: tokens,
        lastDailyReset: startOfToday,
        lastMonthlyReset: currentMonth,
      });
    }
  },
});
