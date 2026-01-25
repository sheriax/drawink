import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

// Define the context type
export interface Context extends Record<string, unknown> {
  userId?: string;
  user?: {
    id: string;
    email: string | null;
    name: string | null;
  };
}

// Create context from request
export const createContext = async (opts: FetchCreateContextFnOptions): Promise<Context> => {
  try {
    // Get the session token from Authorization header
    const authHeader = opts.req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return { userId: undefined, user: undefined };
    }

    const token = authHeader.substring(7);

    // Decode JWT to get user ID (Clerk JWTs are standard JWTs)
    // We'll do basic verification by checking the structure
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));

        // Check if token has required claims
        if (payload.sub && payload.exp) {
          // Check if token is not expired
          if (payload.exp * 1000 > Date.now()) {
            return {
              userId: payload.sub,
              user: {
                id: payload.sub,
                email: payload.email || null,
                name: payload.name || payload.username || null,
              },
            };
          }
        }
      }
    } catch (decodeError) {
      console.error("Token decode failed:", decodeError);
    }
  } catch (error) {
    console.error("Auth context error:", error);
  }

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
