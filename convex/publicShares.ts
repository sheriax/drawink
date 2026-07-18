/**
 * Convex Functions for Public Shareable Links
 *
 * These functions allow ANONYMOUS users to create and access shareable links
 * without requiring authentication. Similar to pastebin, gist, etc.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertLegacyShareAccess, assertPublicShareAccess } from "./roomAccess";

const publicShareResult = v.object({
  payload: v.bytes(),
  title: v.string(),
  createdAt: v.number(),
});

/**
 * Create a public shareable link without requiring a signed-in identity.
 * Stores encrypted scene data and returns a unique link ID
 */
export const createPublicShare = mutation({
  args: {
    // Encrypted payload (full output from compressData())
    // Contains: [encodingMetadataBuffer, iv, encryptedBuffer]
    payload: v.bytes(),

    // Optional metadata
    title: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  returns: v.object({ shareId: v.id("publicShares") }),
  handler: async (ctx, args) => {
    // Anonymous creation is intentional. New clients attach a fragment-key
    // proof that is required for subsequent reads and scoped file operations.

    // Leave headroom under Convex's per-document limit for metadata.
    const MAX_PAYLOAD_BYTES = 900 * 1024;
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
      accessToken: args.accessToken,

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
 * Get a public share by ID using its fragment-key access proof.
 */
export const getPublicShare = query({
  args: {
    shareId: v.id("publicShares"),
    accessToken: v.optional(v.string()),
  },
  returns: publicShareResult,
  handler: async (ctx, args) => {
    const share = await assertPublicShareAccess(ctx, args.shareId, args.accessToken);

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
    accessToken: v.optional(v.string()),
  },
  returns: publicShareResult,
  handler: async (ctx, args) => {
    const share = await assertLegacyShareAccess(ctx, args.shortId, args.accessToken);

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
