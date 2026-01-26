/**
 * Convex Provider Setup with Clerk Authentication
 */

import { useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Initialize Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

interface ConvexClientProviderProps {
  children: ReactNode;
}

/**
 * Convex Provider with Clerk Integration
 *
 * This wraps your app to provide Convex database with Clerk auth integration.
 *
 * IMPORTANT: This component expects ClerkProvider to be present higher in the tree.
 * It uses Clerk's useAuth hook to sync authentication state with Convex.
 */
export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

// Export convex client for use outside React (if needed)
export { convex };
