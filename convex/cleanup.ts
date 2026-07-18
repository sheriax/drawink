/** Retention cleanup for encrypted collaboration and public-share data. */

import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";

const deleteScopedFiles = async (
  ctx: MutationCtx,
  scope: "room" | "publicShare",
  scopeId: string,
) => {
  const files = await ctx.db
    .query("files")
    .withIndex("by_scope", (q) => q.eq("scope", scope).eq("scopeId", scopeId))
    .collect();
  for (const file of files) {
    if (file.storageId) {
      await ctx.storage.delete(file.storageId);
    }
    await ctx.db.delete(file._id);
  }
  return files.length;
};

export const deleteExpiredContent = internalMutation({
  args: {},
  returns: v.object({ rooms: v.number(), shares: v.number(), files: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    const expiredRooms = await ctx.db
      .query("collaborativeRooms")
      .withIndex("by_expires_at", (q) => q.gt("expiresAt", 0).lt("expiresAt", now))
      .take(50);
    const expiredShares = await ctx.db
      .query("publicShares")
      .withIndex("by_expires_at", (q) => q.gt("expiresAt", 0).lt("expiresAt", now))
      .take(50);

    let deletedFiles = 0;
    for (const room of expiredRooms) {
      deletedFiles += await deleteScopedFiles(ctx, "room", room.roomId);
      await ctx.db.delete(room._id);
    }
    for (const share of expiredShares) {
      deletedFiles += await deleteScopedFiles(ctx, "publicShare", share._id);
      await ctx.db.delete(share._id);
    }

    return {
      rooms: expiredRooms.length,
      shares: expiredShares.length,
      files: deletedFiles,
    };
  },
});
