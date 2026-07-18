/**
 * One-time, CLI-only migration helpers for retiring the legacy Drawink Google
 * Cloud project. These functions are internal, so browser clients cannot call
 * them. The migration runner invokes them with an authenticated Convex deploy
 * key and verifies the copied ciphertext before cloud resources are removed.
 */

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";

const migrationStatus = v.union(
  v.literal("inserted"),
  v.literal("updated"),
  v.literal("linked"),
  v.literal("unchanged"),
);

const fileScope = v.union(v.literal("room"), v.literal("publicShare"), v.literal("legacyShare"));

type MigrationFileScope = "room" | "publicShare" | "legacyShare";

const decodeBase64 = (encoded: string): ArrayBuffer => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
};

const encodeBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32_768;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
};

export const upsertCollaborativeRoom = internalMutation({
  args: {
    roomId: v.string(),
    ciphertextBase64: v.string(),
    ivBase64: v.string(),
    sceneVersion: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.object({ status: migrationStatus, roomId: v.string() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("collaborativeRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (existing && existing.updatedAt > args.updatedAt) {
      return { status: "unchanged" as const, roomId: args.roomId };
    }

    const migrated = {
      ciphertext: decodeBase64(args.ciphertextBase64),
      iv: decodeBase64(args.ivBase64),
      sceneVersion: args.sceneVersion,
      updatedAt: args.updatedAt,
    };

    if (existing) {
      await ctx.db.patch(existing._id, migrated);
      return { status: "updated" as const, roomId: args.roomId };
    }

    await ctx.db.insert("collaborativeRooms", {
      roomId: args.roomId,
      ...migrated,
      createdAt: args.createdAt,
    });
    return { status: "inserted" as const, roomId: args.roomId };
  },
});

export const upsertLegacyShare = internalMutation({
  args: {
    shortId: v.string(),
    payloadBase64: v.string(),
    createdAt: v.number(),
  },
  returns: v.object({ status: migrationStatus, shareId: v.id("publicShares") }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("publicShares")
      .withIndex("by_short_id", (q) => q.eq("shortId", args.shortId))
      .first();
    const payload = decodeBase64(args.payloadBase64);

    if (existing) {
      if (
        encodeBase64(existing.payload) === args.payloadBase64 &&
        existing.createdAt === args.createdAt
      ) {
        return { status: "unchanged" as const, shareId: existing._id };
      }
      await ctx.db.patch(existing._id, {
        payload,
        createdAt: args.createdAt,
        expiresAt: undefined,
      });
      return { status: "updated" as const, shareId: existing._id };
    }

    const shareId = await ctx.db.insert("publicShares", {
      payload,
      shortId: args.shortId,
      title: "Migrated drawing",
      createdAt: args.createdAt,
      viewCount: 0,
    });
    return { status: "inserted" as const, shareId };
  },
});

export const upsertWorkspace = internalMutation({
  args: {
    legacyWorkspaceId: v.string(),
    name: v.string(),
    ownerId: v.string(),
    memberCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.object({ status: migrationStatus, workspaceId: v.id("workspaces") }),
  handler: async (ctx, args) => {
    const migrated = await ctx.db
      .query("workspaces")
      .withIndex("by_legacy_firestore_id", (q) => q.eq("legacyFirestoreId", args.legacyWorkspaceId))
      .first();
    if (migrated) {
      return { status: "unchanged" as const, workspaceId: migrated._id };
    }

    const owned = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();
    const reusable = owned.find(
      (workspace) => workspace.legacyFirestoreId === undefined && workspace.name === args.name,
    );

    let workspaceId: Id<"workspaces">;
    let status: "inserted" | "linked";
    if (reusable) {
      workspaceId = reusable._id;
      status = "linked";
      await ctx.db.patch(workspaceId, { legacyFirestoreId: args.legacyWorkspaceId });
    } else {
      workspaceId = await ctx.db.insert("workspaces", {
        name: args.name,
        ownerId: args.ownerId,
        subscriptionTier: "free",
        createdAt: args.createdAt,
        updatedAt: args.updatedAt,
        memberCount: Math.max(1, args.memberCount),
        legacyFirestoreId: args.legacyWorkspaceId,
      });
      status = "inserted";
    }

    const ownerMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", workspaceId).eq("userId", args.ownerId),
      )
      .first();
    if (!ownerMember) {
      await ctx.db.insert("workspaceMembers", {
        workspaceId,
        userId: args.ownerId,
        role: "owner",
        joinedAt: args.createdAt,
      });
    }

    return { status, workspaceId };
  },
});

export const upsertBoard = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    legacyWorkspaceId: v.string(),
    legacyBoardId: v.string(),
    name: v.string(),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.object({ status: migrationStatus, boardId: v.id("boards") }),
  handler: async (ctx, args) => {
    const migrated = await ctx.db
      .query("boards")
      .withIndex("by_legacy_workspace_and_board", (q) =>
        q
          .eq("legacyWorkspaceId", args.legacyWorkspaceId)
          .eq("legacyFirestoreId", args.legacyBoardId),
      )
      .first();
    if (migrated) {
      return { status: "unchanged" as const, boardId: migrated._id };
    }

    const workspaceBoards = await ctx.db
      .query("boards")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    const reusable = workspaceBoards.find(
      (board) => board.legacyFirestoreId === undefined && board.name === args.name,
    );

    if (reusable) {
      await ctx.db.patch(reusable._id, {
        legacyFirestoreId: args.legacyBoardId,
        legacyWorkspaceId: args.legacyWorkspaceId,
      });
      return { status: "linked" as const, boardId: reusable._id };
    }

    const boardId = await ctx.db.insert("boards", {
      name: args.name,
      workspaceId: args.workspaceId,
      ownerId: args.ownerId,
      isPublic: false,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
      lastOpenedAt: args.updatedAt,
      version: 0,
      legacyFirestoreId: args.legacyBoardId,
      legacyWorkspaceId: args.legacyWorkspaceId,
    });
    return { status: "inserted" as const, boardId };
  },
});

export const upsertBoardContent = internalMutation({
  args: {
    boardId: v.id("boards"),
    ciphertextBase64: v.string(),
    ivBase64: v.string(),
    checksum: v.string(),
    version: v.number(),
    updatedAt: v.number(),
    updatedBy: v.string(),
  },
  returns: v.object({ status: migrationStatus, boardId: v.id("boards") }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("boardContent")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .first();

    if (existing && existing.updatedAt > args.updatedAt) {
      return { status: "unchanged" as const, boardId: args.boardId };
    }

    const content = {
      ciphertext: decodeBase64(args.ciphertextBase64),
      iv: decodeBase64(args.ivBase64),
      checksum: args.checksum,
      version: args.version,
      updatedAt: args.updatedAt,
      updatedBy: args.updatedBy,
    };
    if (existing) {
      if (existing.updatedAt === args.updatedAt && existing.checksum === args.checksum) {
        return { status: "unchanged" as const, boardId: args.boardId };
      }
      await ctx.db.patch(existing._id, content);
      const board = await ctx.db.get(args.boardId);
      await ctx.db.patch(args.boardId, {
        version: Math.max(args.version, board?.version ?? 0),
        updatedAt: Math.max(args.updatedAt, board?.updatedAt ?? 0),
      });
      return { status: "updated" as const, boardId: args.boardId };
    }

    await ctx.db.insert("boardContent", { boardId: args.boardId, ...content });
    const board = await ctx.db.get(args.boardId);
    if (board) {
      await ctx.db.patch(args.boardId, {
        version: Math.max(args.version, board.version),
        updatedAt: Math.max(args.updatedAt, board.updatedAt),
      });
    }
    return { status: "inserted" as const, boardId: args.boardId };
  },
});

const assertFileScopeExists = async (
  ctx: Pick<MutationCtx, "db">,
  scope: MigrationFileScope,
  scopeId: string,
) => {
  if (scopeId.length === 0 || scopeId.length > 128) {
    throw new Error("Invalid file scope");
  }

  if (scope === "room") {
    const room = await ctx.db
      .query("collaborativeRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", scopeId))
      .first();
    if (!room) {
      throw new Error(`Room ${scopeId} must be migrated before its files`);
    }
    return;
  }

  if (scope === "legacyShare") {
    const share = await ctx.db
      .query("publicShares")
      .withIndex("by_short_id", (q) => q.eq("shortId", scopeId))
      .first();
    if (!share) {
      throw new Error(`Legacy share ${scopeId} must be migrated before its files`);
    }
    return;
  }

  const shareId = ctx.db.normalizeId("publicShares", scopeId);
  if (!shareId || !(await ctx.db.get(shareId))) {
    throw new Error(`Public share ${scopeId} does not exist`);
  }
};

export const generateFileUploadUrl = internalMutation({
  args: { scope: fileScope, scopeId: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    await assertFileScopeExists(ctx, args.scope, args.scopeId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const registerFile = internalMutation({
  args: {
    scope: fileScope,
    scopeId: v.string(),
    fileId: v.string(),
    storageId: v.id("_storage"),
    createdAt: v.number(),
  },
  returns: v.object({ status: migrationStatus, fileId: v.string() }),
  handler: async (ctx, args) => {
    await assertFileScopeExists(ctx, args.scope, args.scopeId);
    if (args.fileId.length === 0 || args.fileId.length > 256) {
      throw new Error("Invalid file ID");
    }
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) {
      throw new Error("Migrated storage object not found");
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
      throw new Error("Migrated storage object is already registered");
    }
    if (existing?.storageId === args.storageId) {
      return { status: "unchanged" as const, fileId: args.fileId };
    }
    if (existing) {
      await ctx.storage.delete(existing.storageId);
      await ctx.db.patch(existing._id, {
        storageId: args.storageId,
        mimeType: metadata.contentType ?? "application/octet-stream",
        sizeBytes: metadata.size,
      });
      return { status: "updated" as const, fileId: args.fileId };
    }

    await ctx.db.insert("files", {
      fileId: args.fileId,
      storageId: args.storageId,
      scope: args.scope,
      scopeId: args.scopeId,
      mimeType: metadata.contentType ?? "application/octet-stream",
      sizeBytes: metadata.size,
      createdAt: args.createdAt,
    });
    return { status: "inserted" as const, fileId: args.fileId };
  },
});

export const discardFileUpload = internalMutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const registered = await ctx.db
      .query("files")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first();
    if (registered) {
      return null;
    }
    await ctx.storage.delete(args.storageId);
    return null;
  },
});

const verificationBoard = v.object({
  legacyWorkspaceId: v.string(),
  legacyBoardId: v.string(),
});

const verificationFile = v.object({
  scope: fileScope,
  scopeId: v.string(),
  fileId: v.string(),
});

const verifiedContent = v.object({
  ciphertextBase64: v.string(),
  ivBase64: v.string(),
  checksum: v.string(),
  version: v.number(),
  updatedAt: v.number(),
});

const verificationResult = v.object({
  rooms: v.array(
    v.object({
      roomId: v.string(),
      ciphertextBase64: v.optional(v.string()),
      ivBase64: v.optional(v.string()),
      sceneVersion: v.optional(v.number()),
      updatedAt: v.optional(v.number()),
    }),
  ),
  shares: v.array(
    v.object({
      shortId: v.string(),
      payloadBase64: v.optional(v.string()),
      createdAt: v.optional(v.number()),
    }),
  ),
  workspaces: v.array(
    v.object({
      legacyWorkspaceId: v.string(),
      workspaceId: v.optional(v.id("workspaces")),
      ownerId: v.optional(v.string()),
    }),
  ),
  boards: v.array(
    v.object({
      legacyWorkspaceId: v.string(),
      legacyBoardId: v.string(),
      boardId: v.optional(v.id("boards")),
      content: v.optional(verifiedContent),
    }),
  ),
  files: v.array(
    v.object({
      scope: fileScope,
      scopeId: v.string(),
      fileId: v.string(),
      sizeBytes: v.number(),
      url: v.union(v.string(), v.null()),
    }),
  ),
});

export const verify = internalQuery({
  args: {
    roomIds: v.array(v.string()),
    shortIds: v.array(v.string()),
    legacyWorkspaceIds: v.array(v.string()),
    boards: v.array(verificationBoard),
    files: v.array(verificationFile),
  },
  returns: verificationResult,
  handler: async (ctx, args) => {
    const rooms = await Promise.all(
      args.roomIds.map(async (roomId) => {
        const room = await ctx.db
          .query("collaborativeRooms")
          .withIndex("by_room_id", (q) => q.eq("roomId", roomId))
          .first();
        return room
          ? {
              roomId,
              ciphertextBase64: encodeBase64(room.ciphertext),
              ivBase64: encodeBase64(room.iv),
              sceneVersion: room.sceneVersion,
              updatedAt: room.updatedAt,
            }
          : { roomId };
      }),
    );

    const shares = await Promise.all(
      args.shortIds.map(async (shortId) => {
        const share = await ctx.db
          .query("publicShares")
          .withIndex("by_short_id", (q) => q.eq("shortId", shortId))
          .first();
        return share
          ? {
              shortId,
              payloadBase64: encodeBase64(share.payload),
              createdAt: share.createdAt,
            }
          : { shortId };
      }),
    );

    const workspaces = await Promise.all(
      args.legacyWorkspaceIds.map(async (legacyWorkspaceId) => {
        const workspace = await ctx.db
          .query("workspaces")
          .withIndex("by_legacy_firestore_id", (q) => q.eq("legacyFirestoreId", legacyWorkspaceId))
          .first();
        return workspace
          ? { legacyWorkspaceId, workspaceId: workspace._id, ownerId: workspace.ownerId }
          : { legacyWorkspaceId };
      }),
    );

    const boards = await Promise.all(
      args.boards.map(async ({ legacyWorkspaceId, legacyBoardId }) => {
        const board = await ctx.db
          .query("boards")
          .withIndex("by_legacy_workspace_and_board", (q) =>
            q.eq("legacyWorkspaceId", legacyWorkspaceId).eq("legacyFirestoreId", legacyBoardId),
          )
          .first();
        if (!board) {
          return { legacyWorkspaceId, legacyBoardId };
        }
        const content = await ctx.db
          .query("boardContent")
          .withIndex("by_board", (q) => q.eq("boardId", board._id))
          .first();
        return {
          legacyWorkspaceId,
          legacyBoardId,
          boardId: board._id,
          content: content
            ? {
                ciphertextBase64: encodeBase64(content.ciphertext),
                ivBase64: encodeBase64(content.iv),
                checksum: content.checksum,
                version: content.version,
                updatedAt: content.updatedAt,
              }
            : undefined,
        };
      }),
    );

    const files = [];
    for (const requestedFile of args.files) {
      const file = await ctx.db
        .query("files")
        .withIndex("by_scope_and_file", (q) =>
          q
            .eq("scope", requestedFile.scope)
            .eq("scopeId", requestedFile.scopeId)
            .eq("fileId", requestedFile.fileId),
        )
        .first();
      if (file) {
        files.push({
          scope: requestedFile.scope,
          scopeId: requestedFile.scopeId,
          fileId: file.fileId,
          sizeBytes: file.sizeBytes,
          url: await ctx.storage.getUrl(file.storageId),
        });
      }
    }

    return { rooms, shares, workspaces, boards, files };
  },
});
