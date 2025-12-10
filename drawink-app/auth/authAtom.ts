import { atom } from "jotai";
import type { User } from "../data/firebase";

/**
 * Jotai atoms for Firebase Auth state management
 */

// User atom - stores the current Firebase user or null
export const userAtom = atom<User | null>(null);

// Loading state - true while auth state is being determined
export const authLoadingAtom = atom<boolean>(true);

// Auth error - stores any auth-related errors
export const authErrorAtom = atom<string | null>(null);

// Auth dialog visibility
export const authDialogOpenAtom = atom<boolean>(false);

// Email sent confirmation state (for passwordless sign-in)
export const emailSentAtom = atom<string | null>(null);

// Derived atom - is user authenticated
export const isAuthenticatedAtom = atom((get) => {
  const user = get(userAtom);
  return user !== null;
});

// Derived atom - get user display name or email
export const userDisplayNameAtom = atom((get) => {
  const user = get(userAtom);
  if (!user) return null;
  return user.displayName || user.email || "User";
});

// Derived atom - get user avatar URL
export const userAvatarAtom = atom((get) => {
  const user = get(userAtom);
  return user?.photoURL || null;
});
