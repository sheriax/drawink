/**
 * Convex Provider Setup with Clerk Authentication
 */

import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Initialize Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

interface ConvexClientProviderProps {
  children: ReactNode;
}

/**
 * Combined Clerk + Convex Provider
 *
 * This wraps your app to provide:
 * - Clerk authentication
 * - Convex database with auth integration
 */
export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

// Export convex client for use outside React (if needed)
export { convex };
