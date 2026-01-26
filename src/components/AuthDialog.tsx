/**
 * AuthDialog
 *
 * Dialog for authentication using Clerk.
 * Redirects to sign-in page instead of popup.
 */

import { useEffect, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";

import { type AuthState, authStateAtom } from "@drawink/drawink/atoms/auth";
import { Dialog } from "@drawink/drawink/components/Dialog";
import { FilledButton } from "@drawink/drawink/components/FilledButton";
import { useUIAppState } from "@drawink/drawink/context/ui-appState";
import { atom, editorJotaiStore } from "@drawink/drawink/editor-jotai";

import { useAtom } from "../app-jotai";

import "./AuthDialog.scss";

// Auth dialog state atom
export const authDialogStateAtom = atom<{ isOpen: boolean }>({ isOpen: false });

// Custom hook to subscribe to editorJotaiStore atoms
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useEditorStoreAtom<T>(storeAtom: any): T {
  return useSyncExternalStore(
    (callback) => editorJotaiStore.sub(storeAtom, callback),
    () => editorJotaiStore.get(storeAtom) as T,
    () => editorJotaiStore.get(storeAtom) as T,
  );
}

// Cloud icon for header
const CloudSyncIcon = (
  <svg
    aria-hidden="true"
    focusable="false"
    role="img"
    viewBox="0 0 24 24"
    style={{ width: 32, height: 32 }}
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

interface AuthDialogInnerProps {
  handleClose: () => void;
}

const AuthDialogInner = ({ handleClose }: AuthDialogInnerProps) => {
  const navigate = useNavigate();
  const authState = useEditorStoreAtom<AuthState>(authStateAtom);

  const handleSignIn = () => {
    navigate("/sign-in");
  };

  // If user is already authenticated, show success
  if (authState.isAuthenticated && authState.user) {
    return (
      <Dialog size="small" onCloseRequest={handleClose} title={false}>
        <div className="AuthDialog">
          <div className="AuthDialog__header">
            {CloudSyncIcon}
            <h3>Signed In</h3>
          </div>
          <div className="AuthDialog__success">
            <p>
              Welcome, <strong>{authState.user.displayName || authState.user.email}</strong>!
            </p>
            <p className="AuthDialog__success__info">
              Cloud sync is now enabled. Your boards will sync across devices.
            </p>
          </div>
          <div className="AuthDialog__actions">
            <FilledButton size="large" label="Done" onClick={handleClose} />
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog size="small" onCloseRequest={handleClose} title={false}>
      <div className="AuthDialog">
        <div className="AuthDialog__header">
          {CloudSyncIcon}
          <h3>Sign in for Cloud Sync</h3>
        </div>

        <div className="AuthDialog__description">
          <p>Sign in to sync your boards across devices and back up your work to the cloud.</p>
        </div>

        <div className="AuthDialog__buttons">
          <FilledButton
            size="large"
            label="Sign In"
            onClick={handleSignIn}
            className="AuthDialog__button"
          />
        </div>

        <div className="AuthDialog__footer">
          <p>
            <span role="img" aria-hidden="true">
              🔒
            </span>{" "}
            Your data is end-to-end encrypted and only accessible to you.
          </p>
        </div>
      </div>
    </Dialog>
  );
};

export const AuthDialog = () => {
  const [authDialogState, setAuthDialogState] = useAtom(authDialogStateAtom);
  const { openDialog } = useUIAppState();

  // Close dialog when another dialog opens
  useEffect(() => {
    if (openDialog) {
      setAuthDialogState({ isOpen: false });
    }
  }, [openDialog, setAuthDialogState]);

  if (!authDialogState.isOpen) {
    return null;
  }

  return <AuthDialogInner handleClose={() => setAuthDialogState({ isOpen: false })} />;
};
