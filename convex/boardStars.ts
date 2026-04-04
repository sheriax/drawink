/**
 * Convex Queries and Mutations for Board Stars (Favorites)
 *
 * Per-user board starring for quick access to important boards.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserId } from "./users";

// =========================================================================
// QUERIES
// =========================================================================

/**
 * Get all board IDs starred by the current user
 */
export const listStarred = query({
  args: {},
  returns: v.array(
    v.object({
      boardId: v.id("boards"),
      starredAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getUserId(ctx);

    const stars = await ctx.db
      .query("boardStars")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return stars.map((s) => ({
      boardId: s.boardId,
      starredAt: s.starredAt,
    }));
  },
});

// =========================================================================
// MUTATIONS
// =========================================================================

/**
 * Toggle star on a board. If starred, removes it. If not, adds it.
 */
export const toggle = mutation({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.boolean(), // true if now starred, false if unstarred
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    // Check if board exists
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check if already starred
    const existing = await ctx.db
      .query("boardStars")
      .withIndex("by_board_and_user", (q) =>
        q.eq("boardId", args.boardId).eq("userId", userId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }

    await ctx.db.insert("boardStars", {
      boardId: args.boardId,
      userId,
      starredAt: Date.now(),
    });

    return true;
  },
});
