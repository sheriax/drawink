/**
 * One-time script to create a default workspace for a specific user
 *
 * Usage:
 * 1. Make sure you're logged in to the app in your browser
 * 2. Open browser console on the app
 * 3. Copy and paste this script
 * 4. Run: createDefaultWorkspace()
 *
 * OR run via Node if you have the Convex admin key:
 * npx tsx scripts/createDefaultWorkspace.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Configuration
const CONVEX_URL = process.env.VITE_CONVEX_URL || ""; // Set your Convex URL here
const USER_ID = "user_38ljbaWYvlAfHZUpYZ82pcNPAOE"; // Youhana's Clerk user ID

/**
 * Create default workspace for a user
 */
async function createDefaultWorkspaceForUser(userId: string, authToken: string) {
  const client = new ConvexHttpClient(CONVEX_URL);

  // Set authentication
  client.setAuth(async () => authToken);

  try {
    console.log(`[Script] Creating default workspace for user: ${userId}`);

    // Call the ensureDefault mutation
    const workspaceId = await client.mutation(api.workspaces.ensureDefault, {});

    console.log(`[Script] ✅ Default workspace created successfully!`);
    console.log(`[Script] Workspace ID: ${workspaceId}`);

    return workspaceId;
  } catch (error) {
    console.error("[Script] ❌ Failed to create workspace:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Browser console version - use this in your browser dev tools
 */
(window as any).createDefaultWorkspace = async function() {
  try {
    // Get auth token from Clerk
    const clerkAuth = (window as any).Clerk;
    if (!clerkAuth) {
      console.error("[Script] Clerk is not loaded. Make sure you're on the app page.");
      return;
    }

    const token = await clerkAuth.session?.getToken({ template: "convex" });
    if (!token) {
      console.error("[Script] Could not get auth token. Make sure you're logged in.");
      return;
    }

    const userId = clerkAuth.user?.id;
    if (!userId) {
      console.error("[Script] Could not get user ID. Make sure you're logged in.");
      return;
    }

    console.log("[Script] Found user ID:", userId);
    console.log("[Script] Creating default workspace...");

    await createDefaultWorkspaceForUser(userId, token);
  } catch (error) {
    console.error("[Script] Error:", error);
  }
};

// If running in Node.js
if (typeof window === "undefined") {
  console.log(`
==============================================
  Create Default Workspace Script
==============================================

This script should be run in the BROWSER CONSOLE, not Node.js.

Steps:
1. Open your app in the browser
2. Make sure you're logged in
3. Open Developer Tools (F12)
4. Go to Console tab
5. Type: createDefaultWorkspace()
6. Press Enter

The function is already available in the browser when this script loads.
==============================================
  `);
}

export { createDefaultWorkspaceForUser };
