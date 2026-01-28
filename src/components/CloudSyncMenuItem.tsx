/**
 * CloudSyncMenuItem
 *
 * Menu item component for cloud sync login/logout functionality.
 * Shows user info when logged in, or sign-in button that opens AuthDialog.
 */

import type React from "react";
import { useSyncExternalStore } from "react";

import {
  type AuthState,
  authStateAtom,
  cloudEnabledAtom,
  syncStatusAtom,
} from "@/core/atoms/auth";
import { checkIcon, usersIcon } from "@/core/components/icons";
import { editorJotaiStore } from "@/core/editor-jotai";
import { MainMenu } from "@/core/index";
import type { SyncStatus } from "@/core/storage/types";
import { useClerk } from "@clerk/clerk-react";
import { useSetAtom } from "../app-jotai";
import { authDialogStateAtom } from "./AuthDialog";

// Custom hook to subscribe to editorJotaiStore atoms
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useEditorStoreAtom<T>(atom: any): T {
  return useSyncExternalStore(
    (callback) => editorJotaiStore.sub(atom, callback),
    () => editorJotaiStore.get(atom) as T,
    () => editorJotaiStore.get(atom) as T,
  );
}

// Cloud icon
const CloudIcon = (
  <svg
    aria-hidden="true"
    focusable="false"
    role="img"
    viewBox="0 0 24 24"
    style={{ width: 20, height: 20 }}
    stroke="currentColor"
    strokeWidth="1.5"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878" />
  </svg>
);

// Logout icon
const LogoutIcon = (
  <svg
    aria-hidden="true"
    focusable="false"
    role="img"
    viewBox="0 0 24 24"
    style={{ width: 20, height: 20 }}
    stroke="currentColor"
    strokeWidth="1.5"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" />
    <path d="M9 12h12l-3 -3" />
    <path d="M18 15l3 -3" />
  </svg>
);

// Spinner icon for syncing
const SpinnerIcon = (
  <svg
    aria-hidden="true"
    focusable="false"
    role="img"
    viewBox="0 0 24 24"
    style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }}
    stroke="currentColor"
    strokeWidth="1.5"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

/**
 * CloudSyncMenuItem component
 * Renders login/logout options in the main menu based on auth state
 */
export const CloudSyncMenuItem: React.FC = () => {
  // Subscribe to editorJotaiStore
  const authState = useEditorStoreAtom<AuthState>(authStateAtom);
  const cloudEnabled = useEditorStoreAtom<boolean>(cloudEnabledAtom);
  const syncStatus = useEditorStoreAtom<SyncStatus>(syncStatusAtom);

  // Use app-jotai to set dialog state
  const setAuthDialogState = useSetAtom(authDialogStateAtom);

  // Clerk auth hook
  const { signOut } = useClerk();

  const handleSignInClick = () => {
    setAuthDialogState({ isOpen: true });
  };

  const handleLogout = async () => {
    try {
      await signOut();
      console.log("Logged out");
    } catch (error: any) {
      console.error("Logout failed:", error);
    }
  };

  // Logged in state
  if (authState.isAuthenticated && authState.user) {
    return (
      <>
        <MainMenu.Item icon={usersIcon} disabled>
          {authState.user.displayName || authState.user.email || "User"}
        </MainMenu.Item>
        {cloudEnabled && (
          <MainMenu.Item icon={syncStatus === "syncing" ? SpinnerIcon : checkIcon} disabled>
            {syncStatus === "syncing"
              ? "Syncing..."
              : syncStatus === "error"
                ? "Sync error"
                : syncStatus === "offline"
                  ? "Offline"
                  : "Synced"}
          </MainMenu.Item>
        )}
        <MainMenu.Item icon={LogoutIcon} onClick={handleLogout}>
          Sign out
        </MainMenu.Item>
      </>
    );
  }

  // Logged out state - show sign in button that opens AuthDialog
  return (
    <MainMenu.Item icon={CloudIcon} onClick={handleSignInClick} className="highlighted">
      Sign in for Cloud Sync
    </MainMenu.Item>
  );
};
