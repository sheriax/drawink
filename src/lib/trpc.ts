/**
 * tRPC client setup
 * Provides type-safe API calls to the backend
 */

import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { useClerk } from "@clerk/clerk-react";

// For now, we'll use a generic client without full type safety
// TODO: Export AppRouter type from @drawink/trpc package for full type safety
type AnyRouter = any;

// Get API URL from environment
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Create base tRPC client
export const trpc = createTRPCProxyClient<AnyRouter>({
  links: [
    httpBatchLink({
      url: `${API_URL}/trpc`,
      async headers() {
        // Get Clerk auth token if user is signed in
        try {
          const token = await (window as any).Clerk?.session?.getToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        } catch {
          return {};
        }
      },
    }),
  ],
});

// Hook to get authenticated tRPC client
export const useTRPC = () => {
  const { session } = useClerk();

  // Return client with auth token in headers
  return createTRPCProxyClient<AnyRouter>({
    links: [
      httpBatchLink({
        url: `${API_URL}/trpc`,
        async headers() {
          try {
            const token = await session?.getToken();
            return token ? { Authorization: `Bearer ${token}` } : {};
          } catch {
            return {};
          }
        },
      }),
    ],
  });
};
