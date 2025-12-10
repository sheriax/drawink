import { atom } from "jotai";

import type { Workspace, FirestoreBoard } from "../data/firebase";

export const LOCAL_WORKSPACE_ID = "local";

/**
 * Current workspace - the workspace currently being viewed/edited
 */
export const currentWorkspaceAtom = atom<Workspace | null>(null);

/**
 * List of all user's workspaces
 */
export const workspacesAtom = atom<Workspace[]>([]);

/**
 * Boards grouped by workspace ID
 */
export const workspaceBoardsAtom = atom<Map<string, FirestoreBoard[]>>(
  new Map(),
);

/**
 * Loading state for workspace operations
 */
export const workspaceLoadingAtom = atom(false);

/**
 * Error state for workspace operations
 */
export const workspaceErrorAtom = atom<string | null>(null);

/**
 * Whether sync dialog should be shown (local boards found on login)
 */
export const showSyncDialogAtom = atom(false);

/**
 * Local boards pending sync (detected on login)
 */
export const pendingSyncBoardsAtom = atom<
  Array<{ id: string; name: string; elements: any }>
>([]);
