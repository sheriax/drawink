/**
 * Convex Queries and Mutations for Boards
 *
 * This file contains all board-related database operations.
 * Files are stored in Firebase Storage, only metadata + URLs are in Convex.
 */
/**
 * Get all boards in a workspace (not archived)
 */
export declare const listByWorkspace: import("convex/server").RegisteredQuery<"public", {
    workspaceId: import("convex/values").GenericId<"workspaces">;
}, Promise<{
    _id: import("convex/values").GenericId<"boards">;
    _creationTime: number;
    archivedAt?: number | undefined;
    thumbnailUrl?: string | undefined;
    projectId?: import("convex/values").GenericId<"projects"> | undefined;
    publicLinkId?: string | undefined;
    name: string;
    createdAt: number;
    ownerId: string;
    updatedAt: number;
    workspaceId: import("convex/values").GenericId<"workspaces">;
    isPublic: boolean;
    lastOpenedAt: number;
    version: number;
}[]>>;
/**
 * Get recent boards for a workspace
 */
export declare const listRecent: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    workspaceId: import("convex/values").GenericId<"workspaces">;
}, Promise<{
    _id: import("convex/values").GenericId<"boards">;
    _creationTime: number;
    archivedAt?: number | undefined;
    thumbnailUrl?: string | undefined;
    projectId?: import("convex/values").GenericId<"projects"> | undefined;
    publicLinkId?: string | undefined;
    name: string;
    createdAt: number;
    ownerId: string;
    updatedAt: number;
    workspaceId: import("convex/values").GenericId<"workspaces">;
    isPublic: boolean;
    lastOpenedAt: number;
    version: number;
}[]>>;
/**
 * Get a single board by ID
 */
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    boardId: import("convex/values").GenericId<"boards">;
}, Promise<{
    _id: import("convex/values").GenericId<"boards">;
    _creationTime: number;
    archivedAt?: number | undefined;
    thumbnailUrl?: string | undefined;
    projectId?: import("convex/values").GenericId<"projects"> | undefined;
    publicLinkId?: string | undefined;
    name: string;
    createdAt: number;
    ownerId: string;
    updatedAt: number;
    workspaceId: import("convex/values").GenericId<"workspaces">;
    isPublic: boolean;
    lastOpenedAt: number;
    version: number;
}>>;
/**
 * Get board content (encrypted elements + appState)
 */
export declare const getContent: import("convex/server").RegisteredQuery<"public", {
    boardId: import("convex/values").GenericId<"boards">;
}, Promise<{
    _id: import("convex/values").GenericId<"boardContent">;
    _creationTime: number;
    updatedAt: number;
    version: number;
    boardId: import("convex/values").GenericId<"boards">;
    ciphertext: ArrayBuffer;
    iv: ArrayBuffer;
    updatedBy: string;
    checksum: string;
} | {
    boardId: import("convex/values").GenericId<"boards">;
    ciphertext: ArrayBuffer;
    iv: ArrayBuffer;
    version: number;
    updatedAt: number;
    updatedBy: string;
    checksum: string;
}>>;
/**
 * Create a new board
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    projectId?: import("convex/values").GenericId<"projects"> | undefined;
    name: string;
    workspaceId: import("convex/values").GenericId<"workspaces">;
}, Promise<import("convex/values").GenericId<"boards">>>;
/**
 * Update board metadata
 */
export declare const update: import("convex/server").RegisteredMutation<"public", {
    name?: string | undefined;
    thumbnailUrl?: string | undefined;
    projectId?: import("convex/values").GenericId<"projects"> | undefined;
    boardId: import("convex/values").GenericId<"boards">;
}, Promise<import("convex/values").GenericId<"boards">>>;
/**
 * Update last opened timestamp
 */
export declare const updateLastOpened: import("convex/server").RegisteredMutation<"public", {
    boardId: import("convex/values").GenericId<"boards">;
}, Promise<void>>;
/**
 * Save board content (encrypted elements + appState)
 */
export declare const saveContent: import("convex/server").RegisteredMutation<"public", {
    boardId: import("convex/values").GenericId<"boards">;
    ciphertext: ArrayBuffer;
    iv: ArrayBuffer;
    checksum: string;
}, Promise<number>>;
/**
 * Archive a board (soft delete)
 */
export declare const archive: import("convex/server").RegisteredMutation<"public", {
    boardId: import("convex/values").GenericId<"boards">;
}, Promise<void>>;
/**
 * Permanently delete a board and its content
 */
export declare const permanentDelete: import("convex/server").RegisteredMutation<"public", {
    boardId: import("convex/values").GenericId<"boards">;
}, Promise<void>>;
