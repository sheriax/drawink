import { useAtom, useAtomValue, useSetAtom } from "jotai";

import {
  signInWithGoogle,
  signInWithGithub,
  sendEmailSignInLink,
  signOut,
} from "../data/firebase";
import {
  userAtom,
  authLoadingAtom,
  authErrorAtom,
  authDialogOpenAtom,
  emailSentAtom,
  isAuthenticatedAtom,
  userDisplayNameAtom,
  userAvatarAtom,
} from "./authAtom";

/**
 * Custom hook to access auth state and actions
 */
export const useAuth = () => {
  const user = useAtomValue(userAtom);
  const loading = useAtomValue(authLoadingAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const displayName = useAtomValue(userDisplayNameAtom);
  const avatarUrl = useAtomValue(userAvatarAtom);
  const [error, setError] = useAtom(authErrorAtom);
  const [dialogOpen, setDialogOpen] = useAtom(authDialogOpenAtom);
  const [emailSent, setEmailSent] = useAtom(emailSentAtom);

  const handleSignInWithGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
      setDialogOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
    }
  };

  const handleSignInWithGithub = async () => {
    setError(null);
    try {
      await signInWithGithub();
      setDialogOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to sign in with GitHub");
    }
  };

  const handleSendEmailLink = async (email: string) => {
    setError(null);
    try {
      await sendEmailSignInLink(email);
      setEmailSent(email);
    } catch (err: any) {
      setError(err.message || "Failed to send sign-in link");
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      await signOut();
    } catch (err: any) {
      setError(err.message || "Failed to sign out");
    }
  };

  const openAuthDialog = () => {
    setEmailSent(null);
    setError(null);
    setDialogOpen(true);
  };

  const closeAuthDialog = () => {
    setDialogOpen(false);
    setEmailSent(null);
    setError(null);
  };

  return {
    // State
    user,
    loading,
    isAuthenticated,
    displayName,
    avatarUrl,
    error,
    dialogOpen,
    emailSent,
    // Actions
    signInWithGoogle: handleSignInWithGoogle,
    signInWithGithub: handleSignInWithGithub,
    sendEmailLink: handleSendEmailLink,
    signOut: handleSignOut,
    openAuthDialog,
    closeAuthDialog,
  };
};
