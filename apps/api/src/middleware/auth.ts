/**
 * Authentication middleware for tRPC using Clerk
 */

import { clerkClient } from "@clerk/backend";
import type { Context } from "hono";

export interface AuthContext {
  userId?: string;
  user?: {
    id: string;
    email: string | null;
    name: string | null;
  };
}

/**
 * Clerk authentication middleware for Hono
 * Verifies Clerk session token and attaches user info to context
 */
export const authMiddleware = async (c: Context, next: () => Promise<void>) => {
  try {
    // Get the session token from Authorization header
    const authHeader = c.req.header("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      // No auth header, continue without user context
      await next();
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify the token with Clerk
    const clerk = clerkClient();
    const sessionClaims = await clerk.verifyToken(token);

    if (sessionClaims) {
      // Fetch user details
      const user = await clerk.users.getUser(sessionClaims.sub);

      // Attach user info to context
      c.set("userId", user.id);
      c.set("user", {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || null,
        name: user.fullName || user.username || null,
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    // Continue without auth on error (allows public endpoints)
  }

  await next();
};

/**
 * Protected route middleware
 * Throws error if user not authenticated
 */
export const requireAuth = async (c: Context, next: () => Promise<void>) => {
  const userId = c.get("userId");

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
};
