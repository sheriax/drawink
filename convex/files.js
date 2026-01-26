/**
 * Convex Queries and Mutations for Files
 *
 * Stores metadata only - actual files are in Firebase Storage
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
// =========================================================================
// QUERIES
// =========================================================================
/**
 * Get all files for a board
 */
export const listByBoard = query({
    args: {
        boardId: v.id("boards"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized");
        }
        const files = await ctx.db
            .query("files")
            .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
            .collect();
        return files;
    },
});
/**
 * Get a single file by fileId
 */
export const getByFileId = query({
    args: {
        fileId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized");
        }
        const file = await ctx.db
            .query("files")
            .withIndex("by_file_id", (q) => q.eq("fileId", args.fileId))
            .first();
        return file;
    },
});
// =========================================================================
// MUTATIONS
// =========================================================================
/**
 * Save file metadata after uploading to Firebase Storage
 */
export const create = mutation({
    args: {
        boardId: v.id("boards"),
        fileId: v.string(),
        firebaseStorageUrl: v.string(),
        firebaseStoragePath: v.string(),
        mimeType: v.string(),
        sizeBytes: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized");
        }
        // Check board exists
        const board = await ctx.db.get(args.boardId);
        if (!board) {
            throw new Error("Board not found");
        }
        const fileDocId = await ctx.db.insert("files", {
            fileId: args.fileId,
            boardId: args.boardId,
            firebaseStorageUrl: args.firebaseStorageUrl,
            firebaseStoragePath: args.firebaseStoragePath,
            mimeType: args.mimeType,
            sizeBytes: args.sizeBytes,
            createdAt: Date.now(),
            createdBy: identity.subject,
        });
        return fileDocId;
    },
});
/**
 * Delete file metadata (actual file should be deleted from Firebase separately)
 */
export const remove = mutation({
    args: {
        fileId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized");
        }
        const file = await ctx.db
            .query("files")
            .withIndex("by_file_id", (q) => q.eq("fileId", args.fileId))
            .first();
        if (!file) {
            throw new Error("File not found");
        }
        // TODO: Check if user has permission to delete
        // For now, just check if user created it
        if (file.createdBy !== identity.subject) {
            throw new Error("Access denied");
        }
        await ctx.db.delete(file._id);
        // Return path for Firebase Storage deletion
        return file.firebaseStoragePath;
    },
});
