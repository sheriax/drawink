/**
 * Convex Queries and Mutations for Files
 *
 * Stores metadata only - actual files are in Firebase Storage
 */
/**
 * Get all files for a board
 */
export declare const listByBoard: import("convex/server").RegisteredQuery<"public", {
    boardId: import("convex/values").GenericId<"boards">;
}, Promise<{
    _id: import("convex/values").GenericId<"files">;
    _creationTime: number;
    createdAt: number;
    boardId: import("convex/values").GenericId<"boards">;
    createdBy: string;
    sizeBytes: number;
    fileId: string;
    firebaseStorageUrl: string;
    firebaseStoragePath: string;
    mimeType: string;
}[]>>;
/**
 * Get a single file by fileId
 */
export declare const getByFileId: import("convex/server").RegisteredQuery<"public", {
    fileId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"files">;
    _creationTime: number;
    createdAt: number;
    boardId: import("convex/values").GenericId<"boards">;
    createdBy: string;
    sizeBytes: number;
    fileId: string;
    firebaseStorageUrl: string;
    firebaseStoragePath: string;
    mimeType: string;
} | null>>;
/**
 * Save file metadata after uploading to Firebase Storage
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    boardId: import("convex/values").GenericId<"boards">;
    sizeBytes: number;
    fileId: string;
    firebaseStorageUrl: string;
    firebaseStoragePath: string;
    mimeType: string;
}, Promise<import("convex/values").GenericId<"files">>>;
/**
 * Delete file metadata (actual file should be deleted from Firebase separately)
 */
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    fileId: string;
}, Promise<string>>;
