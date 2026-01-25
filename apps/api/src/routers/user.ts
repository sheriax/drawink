/**
 * User router - Protected tRPC endpoints for user-specific operations
 * Demonstrates Clerk authentication integration
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const userRouter = router({
  // Get current user info (protected)
  me: protectedProcedure.query(async ({ ctx }) => {
    // User is guaranteed to exist because of protectedProcedure middleware
    return {
      id: ctx.userId!,
      email: ctx.user?.email,
      name: ctx.user?.name,
    };
  }),

  // Update user preferences (protected)
  updatePreferences: protectedProcedure
    .input(
      z.object({
        theme: z.enum(["light", "dark", "system"]).optional(),
        language: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // In a real implementation, this would save to a database
      console.log(`User ${ctx.userId} updated preferences:`, input);

      return {
        success: true,
        userId: ctx.userId,
      };
    }),

  // Check auth status (public - for testing)
  authStatus: publicProcedure.query(async ({ ctx }) => {
    return {
      isAuthenticated: !!ctx.userId,
      userId: ctx.userId || null,
    };
  }),
});
