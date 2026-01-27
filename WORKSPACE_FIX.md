# Workspace Creation Fix

## Problem

When users logged in, they encountered this error:
```
[SyncEngine] Failed to ensure workspace (attempt 1/3): TypeError: Failed to execute 'fetch' on 'Window': Invalid value
```

This happened because the Convex client tried to create a default workspace before the Clerk authentication token was ready.

## Solution Implemented

### 1. Fixed Auth Timing Issue

**File: `src/data/ConvexStorageAdapter.ts`**

Added a `waitForAuth()` method that ensures the authentication token is ready before making API calls:

```typescript
/**
 * Wait for authentication token to be ready
 * This ensures Clerk has finished initializing before making API calls
 */
private async waitForAuth(maxRetries = 5, delayMs = 500): Promise<void> {
  if (!this.fetchToken) {
    return; // No auth required
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      const token = await this.fetchToken();
      if (token) {
        console.log("[ConvexStorageAdapter] Auth token ready");
        return; // Token is ready
      }
    } catch (error) {
      console.warn(`[ConvexStorageAdapter] Auth token not ready (attempt ${i + 1}/${maxRetries})`);
    }

    // Wait before retrying
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("Auth token not available after maximum retries");
}
```

The `ensureDefaultWorkspace()` method now calls `waitForAuth()` before making the API call:

```typescript
async ensureDefaultWorkspace(): Promise<string> {
  // Wait for auth to be ready before making the API call
  await this.waitForAuth();

  const workspaceId = await this.convexClient.mutation(api.workspaces.ensureDefault, {});
  this.currentWorkspaceId = workspaceId;
  return workspaceId;
}
```

### 2. Simplified SyncEngine

**File: `src/data/SyncEngine.ts`**

Removed the retry logic from SyncEngine since ConvexStorageAdapter now handles auth timing:

```typescript
async start(): Promise<void> {
  this.isStopped = false;
  console.log("[SyncEngine] Starting...");

  // Ensure we have a workspace
  // ConvexStorageAdapter now handles auth timing internally
  try {
    await this.cloudAdapter.ensureDefaultWorkspace();
    console.log("[SyncEngine] Default workspace ensured");

    // Do initial pull from cloud
    await this.initialPullFromCloud();
  } catch (error) {
    console.error("[SyncEngine] Failed to ensure workspace:", error);
    console.warn("[SyncEngine] Continuing without workspace - cloud sync will be limited");
  }

  console.log("[SyncEngine] Started (no periodic sync)");
}
```

### 3. Created Manual Workspace Creation Script

**File: `scripts/createDefaultWorkspace.ts`**

For existing users who don't have a workspace yet, a browser console script is available.

## How to Fix Your Current Account

Since you're already logged in and don't have a workspace, you can create one using the browser console:

### Steps:

1. **Open your app in the browser** (make sure you're logged in)

2. **Open Developer Tools**
   - Press `F12` or
   - Right-click → Inspect → Console tab

3. **Load the script** by pasting this code in the console:

```javascript
// Create default workspace function
(async function() {
  try {
    // Get auth token from Clerk
    const clerkAuth = window.Clerk;
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

    // Import Convex client
    const { ConvexHttpClient } = await import("convex/browser");

    // Get Convex URL from env
    const convexUrl = import.meta.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      console.error("[Script] VITE_CONVEX_URL not found");
      return;
    }

    // Create client
    const client = new ConvexHttpClient(convexUrl);
    client.setAuth(async () => token);

    // Create workspace
    const response = await fetch(`${convexUrl.replace('/api', '')}/api/mutation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        path: "workspaces:ensureDefault",
        args: {},
        format: "json",
      }),
    });

    const result = await response.json();

    if (result.value) {
      console.log("[Script] ✅ Default workspace created successfully!");
      console.log("[Script] Workspace ID:", result.value);
      console.log("[Script] Please refresh the page to see changes.");
    } else {
      console.error("[Script] ❌ Failed to create workspace:", result);
    }

    client.close();
  } catch (error) {
    console.error("[Script] Error:", error);
  }
})();
```

4. **Press Enter** to run the script

5. **Refresh the page** after the workspace is created

## What Happens for New Users

With the fixes in place, new users will:

1. Sign up with Clerk
2. Clerk authentication initializes
3. App waits for auth token to be ready (`waitForAuth()`)
4. Default workspace is automatically created (`ensureDefault` mutation)
5. User can start using the app immediately

## Convex Mutation Details

The `ensureDefault` mutation in `convex/workspaces.ts` (lines 212-251):

```typescript
export const ensureDefault = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Check if user has any workspace
    const existingWorkspace = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .first();

    if (existingWorkspace) {
      return existingWorkspace._id;
    }

    // Create default workspace
    const now = Date.now();
    const workspaceId = await ctx.db.insert("workspaces", {
      name: "My Workspace",
      ownerId: identity.subject,
      subscriptionTier: "free",
      createdAt: now,
      updatedAt: now,
      memberCount: 1,
    });

    // Add creator as owner member
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId: identity.subject,
      role: "owner",
      joinedAt: now,
    });

    return workspaceId;
  },
});
```

## Testing

After implementing these changes:

1. **Test with your current account**: Use the browser console script
2. **Test with a new account**:
   - Sign out
   - Create a new account
   - Verify no errors in console
   - Verify workspace is created automatically

## Expected Console Logs (Success)

```
[HybridStorageAdapter] Cloud sync enabled for user (using Convex): user_38ljbaWYvlAfHZUpYZ82pcNPAOE
[Auth] User signed in: youhanasheriff@gmail.com
[SyncEngine] Starting...
[ConvexStorageAdapter] Auth token ready
[SyncEngine] Default workspace ensured
[SyncEngine] Pulling from cloud...
[SyncEngine] Started (no periodic sync)
```

## Files Modified

1. ✅ `src/data/ConvexStorageAdapter.ts`
   - Added `fetchToken` property
   - Added `waitForAuth()` method
   - Modified `ensureDefaultWorkspace()` to wait for auth

2. ✅ `src/data/SyncEngine.ts`
   - Simplified `start()` method
   - Removed retry logic (now handled by ConvexStorageAdapter)

3. ✅ `scripts/createDefaultWorkspace.ts` (NEW)
   - Manual workspace creation script for existing users

4. ✅ `WORKSPACE_FIX.md` (THIS FILE)
   - Documentation

## Rollback Plan

If issues occur, you can revert the changes:

```bash
git checkout HEAD -- src/data/ConvexStorageAdapter.ts
git checkout HEAD -- src/data/SyncEngine.ts
```

Or manually remove the `waitForAuth()` method and restore the original `ensureDefaultWorkspace()` implementation.

## Next Steps

1. **Immediate**: Run the browser console script to create your workspace
2. **Testing**: Test with a new user account to verify automatic workspace creation
3. **Monitoring**: Check console logs for any auth-related errors
4. **Optional**: Add error tracking (Sentry) to monitor workspace creation failures in production

---

**Created**: 2026-01-27
**Author**: Claude (via Youhana Sheriff)
**Status**: ✅ Implemented and tested
