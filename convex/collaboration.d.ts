/**
 * Convex Collaboration Functions
 *
 * Real-time collaboration features for Drawink boards:
 * - Live presence (who's on the board)
 * - Live cursor tracking
 * - Heartbeat system for presence detection
 * - Automatic stale session cleanup
 */
/**
 * Join a board (start collaborative session)
 */
export declare const join: import("convex/server").RegisteredMutation<"public", {
    userPhotoUrl?: string | undefined;
    boardId: import("convex/values").GenericId<"boards">;
    userName: string;
}, Promise<import("convex/values").GenericId<"collaborationSessions">>>;
/**
 * Leave a board (end collaborative session)
 */
export declare const leave: import("convex/server").RegisteredMutation<"public", {
    boardId: import("convex/values").GenericId<"boards">;
}, Promise<void>>;
/**
 * Update cursor position
 */
export declare const updateCursor: import("convex/server").RegisteredMutation<"public", {
    boardId: import("convex/values").GenericId<"boards">;
    x: number;
    y: number;
}, Promise<void>>;
/**
 * Send heartbeat (keep session alive)
 */
export declare const heartbeat: import("convex/server").RegisteredMutation<"public", {
    boardId: import("convex/values").GenericId<"boards">;
}, Promise<void>>;
/**
 * Get all active users on a board (real-time!)
 */
export declare const getActiveUsers: import("convex/server").RegisteredQuery<"public", {
    boardId: import("convex/values").GenericId<"boards">;
}, Promise<{
    _id: import("convex/values").GenericId<"collaborationSessions">;
    _creationTime: number;
    userPhotoUrl?: string | undefined;
    cursorX?: number | undefined;
    cursorY?: number | undefined;
    userId: string;
    joinedAt: number;
    boardId: import("convex/values").GenericId<"boards">;
    userName: string;
    isActive: boolean;
    lastHeartbeat: number;
}[]>>;
/**
 * Get all cursor positions for active users (real-time!)
 */
export declare const getCursors: import("convex/server").RegisteredQuery<"public", {
    boardId: import("convex/values").GenericId<"boards">;
}, Promise<{
    userId: string;
    userName: string;
    userPhotoUrl: string | undefined;
    cursorX: number;
    cursorY: number;
    color: string;
    isActive: boolean;
    lastHeartbeat: number;
}[]>>;
/**
 * Get collaboration statistics for a board
 */
export declare const getStats: import("convex/server").RegisteredQuery<"public", {
    boardId: import("convex/values").GenericId<"boards">;
}, Promise<{
    activeCount: number;
    totalCollaborators: number;
    currentSessions: {
        userName: string;
        joinedAt: number;
        lastActivity: number;
    }[];
}>>;
/**
 * Cleanup stale sessions (called by scheduled function)
 * This can be run periodically to clean up old sessions
 */
export declare const cleanupStaleSessions: import("convex/server").RegisteredMutation<"public", {}, Promise<{
    cleanedCount: number;
    totalSessions: number;
}>>;
