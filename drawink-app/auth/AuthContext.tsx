import React, { useEffect } from "react";
import { useSetAtom } from "jotai";

import {
  onAuthChange,
  completeEmailSignIn,
  isEmailSignInLink,
} from "../data/firebase";
import {
  userAtom,
  authLoadingAtom,
  authErrorAtom,
} from "./authAtom";

/**
 * AuthProvider component that initializes Firebase Auth listener
 * and handles email link sign-in completion
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const setUser = useSetAtom(userAtom);
  const setLoading = useSetAtom(authLoadingAtom);
  const setError = useSetAtom(authErrorAtom);

  useEffect(() => {
    // Check for email sign-in link and complete sign-in if present
    const handleEmailSignIn = async () => {
      if (isEmailSignInLink()) {
        try {
          await completeEmailSignIn();
        } catch (error: any) {
          console.error("Email sign-in error:", error);
          setError(error.message || "Failed to complete email sign-in");
        }
      }
    };

    handleEmailSignIn();

    // Subscribe to auth state changes
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [setUser, setLoading, setError]);

  return <>{children}</>;
};
