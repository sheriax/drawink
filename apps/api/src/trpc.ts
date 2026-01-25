import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

// Define the context type
export interface Context {
  userId?: string;
  user?: {
    id: string;
    email: string | null;
    name: string | null;
  };
}

// Create context from request
export const createContext = async (opts: FetchCreateContextFnOptions): Promise<Context> => {
  // The auth will be populated by the Clerk middleware
  return {
    userId: undefined,
    user: undefined,
  };
};

// Initialize tRPC with context
const t = initTRPC.context<Context>().create();

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware to check if user is authenticated
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({
    ctx: {
      userId: ctx.userId,
      user: ctx.user,
    },
  });
});

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(isAuthed);
