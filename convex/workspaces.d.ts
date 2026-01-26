/**
 * Convex Queries and Mutations for Workspaces
 */
/**
 * Get all workspaces for the current user
 */
export declare const listMine: import("convex/server").RegisteredQuery<"public", {}, Promise<({
    _id: import("convex/values").GenericId<"workspaces">;
    _creationTime: number;
    clerkOrgId?: string | undefined;
    name: string;
    subscriptionTier: "free" | "team";
    createdAt: number;
    ownerId: string;
    updatedAt: number;
    memberCount: number;
} | null)[]>>;
/**
 * Get a single workspace by ID
 */
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    workspaceId: import("convex/values").GenericId<"workspaces">;
}, Promise<{
    _id: import("convex/values").GenericId<"workspaces">;
    _creationTime: number;
    clerkOrgId?: string | undefined;
    name: string;
    subscriptionTier: "free" | "team";
    createdAt: number;
    ownerId: string;
    updatedAt: number;
    memberCount: number;
}>>;
/**
 * Get workspace members
 */
export declare const getMembers: import("convex/server").RegisteredQuery<"public", {
    workspaceId: import("convex/values").GenericId<"workspaces">;
}, Promise<{
    user: {
        _id: import("convex/values").GenericId<"users">;
        _creationTime: number;
        photoUrl?: string | undefined;
        stripeCustomerId?: string | undefined;
        stripeSubscriptionId?: string | undefined;
        subscriptionExpiresAt?: number | undefined;
        clerkId: string;
        email: string;
        name: string;
        subscriptionTier: "free" | "pro" | "team";
        createdAt: number;
        lastLoginAt: number;
    } | null;
    _id: import("convex/values").GenericId<"workspaceMembers">;
    _creationTime: number;
    workspaceId: import("convex/values").GenericId<"workspaces">;
    userId: string;
    role: "owner" | "admin" | "member" | "viewer";
    joinedAt: number;
}[]>>;
/**
 * Create a new workspace
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    clerkOrgId?: string | undefined;
    name: string;
}, Promise<import("convex/values").GenericId<"workspaces">>>;
/**
 * Update workspace
 */
export declare const update: import("convex/server").RegisteredMutation<"public", {
    name?: string | undefined;
    workspaceId: import("convex/values").GenericId<"workspaces">;
}, Promise<import("convex/values").GenericId<"workspaces">>>;
/**
 * Ensure default workspace exists for user
 */
export declare const ensureDefault: import("convex/server").RegisteredMutation<"public", {}, Promise<import("convex/values").GenericId<"workspaces">>>;
