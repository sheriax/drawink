/**
 * Convex Provider Setup with Clerk Authentication
 */

import { useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Validate and initialize Convex client
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
  throw new Error(
    "Missing Convex URL. Please ensure VITE_CONVEX_URL is set in your .env.local file.\n" +
    "Expected format: VITE_CONVEX_URL=https://your-deployment-name.convex.cloud"
  );
}

const convex = new ConvexReactClient(CONVEX_URL);

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
