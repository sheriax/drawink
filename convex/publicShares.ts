/**
 * Convex Functions for Public Shareable Links
 *
 * These functions allow ANONYMOUS users to create and access shareable links
 * without requiring authentication. Similar to pastebin, gist, etc.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a public shareable link (NO AUTH REQUIRED)
 * Stores encrypted scene data and returns a unique link ID
 */
export const createPublicShare = mutation({
  args: {
    // Encrypted payload (full output from compressData())
    // Contains: [encodingMetadataBuffer, iv, encryptedBuffer]
    payload: v.bytes(),

    // Optional metadata
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // NO AUTH CHECK - Allow anonymous sharing!

    // Validate payload size (max 5MB)
    const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;
    if (args.payload.byteLength > MAX_PAYLOAD_BYTES) {
      throw new Error(
        `Payload too large: ${args.payload.byteLength} bytes exceeds maximum of ${MAX_PAYLOAD_BYTES} bytes`,
      );
    }

    // Validate title length (max 200 chars)
    const title = args.title ? args.title.slice(0, 200) : "Untitled";

    // Generate a unique public link ID (Convex auto-generates IDs)
    const shareId = await ctx.db.insert("publicShares", {
      payload: args.payload,
      title,

      // Metadata
      createdAt: Date.now(),
      viewCount: 0,

      // Optional: Add expiration (30 days for free tier)
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    return { shareId };
  },
});

/**
 * Get public share by ID (NO AUTH REQUIRED)
 * Anyone with the link can view
 */
export const getPublicShare = query({
  args: {
    shareId: v.id("publicShares"),
  },
  handler: async (ctx, args) => {
    // NO AUTH CHECK - Public links are accessible to anyone

    const share = await ctx.db.get(args.shareId);

    if (!share) {
      throw new Error("Share not found");
    }

    // Check expiration
    if (share.expiresAt && share.expiresAt < Date.now()) {
      throw new Error("Share has expired");
    }

    // Note: View count tracking removed - queries are read-only.
    // Could be implemented with a separate mutation if needed.

    return {
      payload: share.payload,
      title: share.title,
      createdAt: share.createdAt,
    };
  },
});

/**
 * Get public share by legacy format (for backward compatibility)
 * Old format: #json=<shortId>,<encryptionKey>
 */
export const getPublicShareByShortId = query({
  args: {
    shortId: v.string(),
  },
  handler: async (ctx, args) => {
    // Query by short ID
    const share = await ctx.db
      .query("publicShares")
      .withIndex("by_short_id", (q) => q.eq("shortId", args.shortId))
      .first();

    if (!share) {
      throw new Error("Share not found");
    }

    // Check expiration
    if (share.expiresAt && share.expiresAt < Date.now()) {
      throw new Error("Share has expired");
    }

    // Note: View count tracking removed - queries are read-only.
    // Could be implemented with a separate mutation if needed.

    return {
      payload: share.payload,
      title: share.title,
      createdAt: share.createdAt,
    };
  },
});
