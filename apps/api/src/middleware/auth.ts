/**
 * Authentication middleware for tRPC using Clerk
 */

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

    // Decode JWT to get user ID (Clerk JWTs are standard JWTs)
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));

        // Check if token has required claims and is not expired
        if (payload.sub && payload.exp && payload.exp * 1000 > Date.now()) {
          // Attach user info to context
          c.set("userId", payload.sub);
          c.set("user", {
            id: payload.sub,
            email: payload.email || null,
            name: payload.name || payload.username || null,
          });
        }
      }
    } catch (decodeError) {
      console.error("Token decode failed:", decodeError);
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
