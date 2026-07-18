/**
 * Convex Storage functions for encrypted collaboration and share files.
 *
 * The stored bytes are encrypted in the browser. Download URLs are bearer URLs,
 * but possession of one reveals only ciphertext without the fragment-only key.
 */

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { assertLegacyShareAccess, assertPublicShareAccess, assertRoomAccess } from "./roomAccess";

const MAX_ENCRYPTED_FILE_BYTES = 5 * 1024 * 1024;

const scopeValidator = v.union(
  v.literal("room"),
  v.literal("publicShare"),
  v.literal("legacyShare"),
);

type PublicFileScope = "room" | "publicShare" | "legacyShare";

const validateFileId = (fileId: string) => {
  if (fileId.length === 0 || fileId.length > 256) {
    throw new Error("Invalid file ID");
  }
};

const authorizeScope = async (
  ctx: QueryCtx | MutationCtx,
  scope: PublicFileScope,
  scopeId: string,
  accessToken: string | undefined,
) => {
  if (scopeId.length === 0 || scopeId.length > 128) {
    throw new Error("Invalid file scope");
  }

  switch (scope) {
    case "room":
      await assertRoomAccess(ctx, scopeId, accessToken);
      return;
    case "publicShare":
      await assertPublicShareAccess(ctx, scopeId as Id<"publicShares">, accessToken);
      return;
    case "legacyShare":
      await assertLegacyShareAccess(ctx, scopeId, accessToken);
      return;
  }
};

export const generateUploadUrl = mutation({
  args: {
    scope: scopeValidator,
    scopeId: v.string(),
    accessToken: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await authorizeScope(ctx, args.scope, args.scopeId, args.accessToken);
    return await ctx.storage.generateUploadUrl();
  },
});

export const registerUpload = mutation({
  args: {
    scope: scopeValidator,
    scopeId: v.string(),
    accessToken: v.optional(v.string()),
    fileId: v.string(),
    storageId: v.id("_storage"),
  },
  returns: v.id("files"),
  handler: async (ctx, args) => {
    await authorizeScope(ctx, args.scope, args.scopeId, args.accessToken);
    validateFileId(args.fileId);

    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) {
      throw new Error("Uploaded file not found");
    }
    if (metadata.size > MAX_ENCRYPTED_FILE_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw new Error("Encrypted file is too large");
    }

    const existing = await ctx.db
      .query("files")
      .withIndex("by_scope_and_file", (q) =>
        q.eq("scope", args.scope).eq("scopeId", args.scopeId).eq("fileId", args.fileId),
      )
      .first();
    const storageOwner = await ctx.db
      .query("files")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first();
    if (storageOwner && storageOwner._id !== existing?._id) {
      throw new Error("Uploaded file is already registered to another scope");
    }

    if (existing) {
      if (existing.storageId && existing.storageId !== args.storageId) {
        await ctx.storage.delete(existing.storageId);
      }
      await ctx.db.patch(existing._id, {
        storageId: args.storageId,
        mimeType: metadata.contentType ?? "application/octet-stream",
        sizeBytes: metadata.size,
      });
      return existing._id;
    }

    const identity = await ctx.auth.getUserIdentity();
    return await ctx.db.insert("files", {
      fileId: args.fileId,
      storageId: args.storageId,
      scope: args.scope,
      scopeId: args.scopeId,
      mimeType: metadata.contentType ?? "application/octet-stream",
      sizeBytes: metadata.size,
      createdAt: Date.now(),
      createdBy: identity?.subject,
    });
  },
});

export const discardUpload = mutation({
  args: {
    scope: scopeValidator,
    scopeId: v.string(),
    accessToken: v.optional(v.string()),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await authorizeScope(ctx, args.scope, args.scopeId, args.accessToken);
    const registered = await ctx.db
      .query("files")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first();
    if (registered) {
      throw new Error("Registered files must be removed through their owning scope");
    }
    await ctx.storage.delete(args.storageId);
    return null;
  },
});

export const getDownloadUrls = query({
  args: {
    scope: scopeValidator,
    scopeId: v.string(),
    accessToken: v.optional(v.string()),
    fileIds: v.array(v.string()),
  },
  returns: v.array(
    v.object({
      fileId: v.string(),
      url: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    await authorizeScope(ctx, args.scope, args.scopeId, args.accessToken);
    if (args.fileIds.length > 100) {
      throw new Error("At most 100 file IDs can be requested at once");
    }
    for (const fileId of args.fileIds) {
      validateFileId(fileId);
    }

    const uniqueFileIds = [...new Set(args.fileIds)];
    const results = await Promise.all(
      uniqueFileIds.map(async (fileId) => {
        const file = await ctx.db
          .query("files")
          .withIndex("by_scope_and_file", (q) =>
            q.eq("scope", args.scope).eq("scopeId", args.scopeId).eq("fileId", fileId),
          )
          .first();
        if (!file?.storageId) {
          return null;
        }

        const url = await ctx.storage.getUrl(file.storageId);
        return url ? { fileId, url } : null;
      }),
    );

    return results.filter((result): result is { fileId: string; url: string } => result !== null);
  },
});

export const remove = mutation({
  args: {
    scope: scopeValidator,
    scopeId: v.string(),
    accessToken: v.optional(v.string()),
    fileId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await authorizeScope(ctx, args.scope, args.scopeId, args.accessToken);
    validateFileId(args.fileId);

    const file = await ctx.db
      .query("files")
      .withIndex("by_scope_and_file", (q) =>
        q.eq("scope", args.scope).eq("scopeId", args.scopeId).eq("fileId", args.fileId),
      )
      .first();
    if (!file) {
      return false;
    }

    if (file.storageId) {
      await ctx.storage.delete(file.storageId);
    }
    await ctx.db.delete(file._id);
    return true;
  },
});
