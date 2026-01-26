/**
 * Convex User Management (synced from Clerk)
 *
 * Users are created/updated via Clerk webhook
 * This file contains queries for user data
 */
/**
 * Get current user
 */
export declare const getCurrent: import("convex/server").RegisteredQuery<"public", {}, Promise<{
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
} | null>>;
/**
 * Get user by Clerk ID
 */
export declare const getByClerkId: import("convex/server").RegisteredQuery<"public", {
    clerkId: string;
}, Promise<{
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
} | null>>;
/**
 * Create or update user from Clerk webhook
 * This is called automatically when user signs up/updates profile
 */
export declare const upsertFromClerk: import("convex/server").RegisteredMutation<"public", {
    photoUrl?: string | undefined;
    clerkId: string;
    email: string;
    name: string;
}, Promise<import("convex/values").GenericId<"users">>>;
/**
 * Update user subscription (called by Stripe webhook)
 */
export declare const updateSubscription: import("convex/server").RegisteredMutation<"public", {
    stripeCustomerId?: string | undefined;
    stripeSubscriptionId?: string | undefined;
    expiresAt?: number | undefined;
    clerkId: string;
    tier: "free" | "pro" | "team";
}, Promise<void>>;
