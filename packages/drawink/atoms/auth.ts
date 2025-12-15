/**
 * Auth Atoms
 *
 * Jotai atoms for managing authentication state in Drawink.
 * These atoms track user authentication, cloud sync status, and sync state.
 */

import { atom } from "../editor-jotai";

import type { SyncStatus } from "../storage/types";

/**
 * User information from Firebase Auth
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId: string;
}

/**
 * Authentication state
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// Core Auth Atoms
// ============================================================================

/**
 * Current authentication state
 */
export const authStateAtom = atom<AuthState>({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  error: null,
});

/**
 * Whether cloud sync is currently enabled
 */
export const cloudEnabledAtom = atom<boolean>(false);

/**
 * Current sync status
 */
export const syncStatusAtom = atom<SyncStatus>("idle");

/**
 * Timestamp of last successful sync
 */
export const lastSyncAtom = atom<number | null>(null);

/**
 * Number of pending changes to sync
 */
export const pendingChangesAtom = atom<number>(0);

// ============================================================================
// Derived Atoms
// ============================================================================

/**
 * Whether the user is currently logged in
 */
export const isLoggedInAtom = atom((get) => {
  const authState = get(authStateAtom);
  return authState.isAuthenticated && authState.user !== null;
});

/**
 * Display name for the current user (for UI)
 */
export const userDisplayNameAtom = atom((get) => {
  const authState = get(authStateAtom);
  if (!authState.user) {
    return null;
  }
  return authState.user.displayName || authState.user.email || "User";
});

/**
 * Whether we're currently syncing
 */
export const isSyncingAtom = atom((get) => {
  return get(syncStatusAtom) === "syncing";
});

/**
 * Whether there's a sync error
 */
export const hasSyncErrorAtom = atom((get) => {
  return get(syncStatusAtom) === "error";
});

// ============================================================================
// Action Atoms
// ============================================================================

/**
 * Update auth state (called by auth state listener)
 */
export const setAuthStateAtom = atom(
  null,
  (get, set, authState: AuthState) => {
    set(authStateAtom, authState);
  },
);

/**
 * Update sync status
 */
export const setSyncStatusAtom = atom(null, (get, set, status: SyncStatus) => {
  set(syncStatusAtom, status);
  if (status === "idle") {
    set(lastSyncAtom, Date.now());
  }
});

/**
 * Enable cloud sync (called after successful login)
 */
export const enableCloudSyncAtom = atom(null, (get, set) => {
  set(cloudEnabledAtom, true);
  set(syncStatusAtom, "idle");
});

/**
 * Disable cloud sync (called after logout)
 */
export const disableCloudSyncAtom = atom(null, (get, set) => {
  set(cloudEnabledAtom, false);
  set(syncStatusAtom, "idle");
  set(lastSyncAtom, null);
  set(pendingChangesAtom, 0);
});

/**
 * Clear auth error
 */
export const clearAuthErrorAtom = atom(null, (get, set) => {
  const currentState = get(authStateAtom);
  set(authStateAtom, { ...currentState, error: null });
});
