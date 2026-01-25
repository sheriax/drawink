/**
 * Authentication middleware for tRPC
 * Will integrate with Clerk in Phase 2
 */

import type { Context } from 'hono';

export interface AuthContext {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * Placeholder auth middleware
 * TODO: Integrate with Clerk in Phase 2
 */
export const authMiddleware = async (c: Context, next: () => Promise<void>) => {
  // For now, allow all requests
  // In Phase 2, this will verify Clerk JWT tokens
  await next();
};

/**
 * Protected procedure middleware
 * TODO: Throw error if user not authenticated
 */
export const requireAuth = async (c: Context, next: () => Promise<void>) => {
  // For now, allow all requests
  // In Phase 2, this will check authentication
  await next();
};
