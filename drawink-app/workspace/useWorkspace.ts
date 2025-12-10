import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

import { useAuth } from "../auth";
import {
  createWorkspace as createWorkspaceApi,
  getWorkspaces as getWorkspacesApi,
  updateWorkspace as updateWorkspaceApi,
  deleteWorkspace as deleteWorkspaceApi,
  createFirestoreBoard,
  getFirestoreBoards,
  updateFirestoreBoard,
  deleteFirestoreBoard,
  type Workspace,
  type FirestoreBoard,
} from "../data/firebase";
import { LocalData } from "../data/LocalData";
import {
  currentWorkspaceAtom,
  workspacesAtom,
  workspaceBoardsAtom,
  workspaceLoadingAtom,
  workspaceErrorAtom,
  showSyncDialogAtom,
  pendingSyncBoardsAtom,
} from "./workspaceAtom";

/**
 * Hook for workspace and board management operations
 */
export const useWorkspace = () => {
  const { user, isAuthenticated } = useAuth();

  const [workspaces, setWorkspaces] = useAtom(workspacesAtom);
  const [currentWorkspace, setCurrentWorkspace] = useAtom(currentWorkspaceAtom);
  const [workspaceBoards, setWorkspaceBoards] = useAtom(workspaceBoardsAtom);
  const [loading, setLoading] = useAtom(workspaceLoadingAtom);
  const [error, setError] = useAtom(workspaceErrorAtom);
  const [showSyncDialog, setShowSyncDialog] = useAtom(showSyncDialogAtom);
  const [pendingSyncBoards, setPendingSyncBoards] = useAtom(pendingSyncBoardsAtom);

  /**
   * Load all workspaces for the current user
   */
  const loadWorkspaces = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      const userWorkspaces = await getWorkspacesApi(user.uid);
      setWorkspaces(userWorkspaces);

      // Load boards for each workspace
      const boardsMap = new Map<string, FirestoreBoard[]>();
      await Promise.all(
        userWorkspaces.map(async (workspace) => {
          const boards = await getFirestoreBoards(workspace.id);
          boardsMap.set(workspace.id, boards);
        }),
      );
      setWorkspaceBoards(boardsMap);
    } catch (err: any) {
      setError(err.message || "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }, [user?.uid, setWorkspaces, setWorkspaceBoards, setLoading, setError]);

  /**
   * Create a new workspace
   */
  const createWorkspace = useCallback(
    async (name: string): Promise<Workspace | null> => {
      if (!user?.uid) return null;

      setLoading(true);
      setError(null);

      try {
        const workspace = await createWorkspaceApi(user.uid, name);
        setWorkspaces((prev) => [workspace, ...prev]);
        setWorkspaceBoards((prev) => new Map(prev).set(workspace.id, []));
        return workspace;
      } catch (err: any) {
        setError(err.message || "Failed to create workspace");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.uid, setWorkspaces, setWorkspaceBoards, setLoading, setError],
  );

  /**
   * Rename a workspace
   */
  const renameWorkspace = useCallback(
    async (workspaceId: string, name: string): Promise<void> => {
      setError(null);

      try {
        await updateWorkspaceApi(workspaceId, { name });
        setWorkspaces((prev) =>
          prev.map((w) =>
            w.id === workspaceId ? { ...w, name, lastModified: Date.now() } : w,
          ),
        );
      } catch (err: any) {
        setError(err.message || "Failed to rename workspace");
      }
    },
    [setWorkspaces, setError],
  );

  /**
   * Delete a workspace and all its boards
   */
  const removeWorkspace = useCallback(
    async (workspaceId: string): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        await deleteWorkspaceApi(workspaceId);
        setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
        setWorkspaceBoards((prev) => {
          const newMap = new Map(prev);
          newMap.delete(workspaceId);
          return newMap;
        });

        if (currentWorkspace?.id === workspaceId) {
          setCurrentWorkspace(null);
        }
      } catch (err: any) {
        setError(err.message || "Failed to delete workspace");
      } finally {
        setLoading(false);
      }
    },
    [currentWorkspace, setWorkspaces, setWorkspaceBoards, setCurrentWorkspace, setLoading, setError],
  );

  /**
   * Select a workspace
   */
  const selectWorkspace = useCallback(
    (workspaceId: string) => {
      const workspace = workspaces.find((w) => w.id === workspaceId);
      setCurrentWorkspace(workspace || null);
    },
    [workspaces, setCurrentWorkspace],
  );

  /**
   * Create a new board in a workspace
   */
  const createBoard = useCallback(
    async (workspaceId: string, name: string, existingBoardId?: string): Promise<FirestoreBoard | null> => {
      if (!user?.uid) return null;

      setError(null);

      try {
        const board = await createFirestoreBoard(workspaceId, user.uid, name, existingBoardId);
        setWorkspaceBoards((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(workspaceId) || [];
          newMap.set(workspaceId, [board, ...existing]);
          return newMap;
        });
        return board;
      } catch (err: any) {
        setError(err.message || "Failed to create board");
        return null;
      }
    },
    [user?.uid, setWorkspaceBoards, setError],
  );

  /**
   * Rename a board
   */
  const renameBoard = useCallback(
    async (boardId: string, workspaceId: string, name: string): Promise<void> => {
      setError(null);

      try {
        await updateFirestoreBoard(boardId, { name });
        setWorkspaceBoards((prev) => {
          const newMap = new Map(prev);
          const boards = newMap.get(workspaceId) || [];
          newMap.set(
            workspaceId,
            boards.map((b) =>
              b.id === boardId ? { ...b, name, lastModified: Date.now() } : b,
            ),
          );
          return newMap;
        });
      } catch (err: any) {
        setError(err.message || "Failed to rename board");
      }
    },
    [setWorkspaceBoards, setError],
  );

  /**
   * Delete a board
   */
  const removeBoard = useCallback(
    async (boardId: string, workspaceId: string): Promise<void> => {
      setError(null);

      try {
        await deleteFirestoreBoard(boardId);
        setWorkspaceBoards((prev) => {
          const newMap = new Map(prev);
          const boards = newMap.get(workspaceId) || [];
          newMap.set(
            workspaceId,
            boards.filter((b) => b.id !== boardId),
          );
          return newMap;
        });
      } catch (err: any) {
        setError(err.message || "Failed to delete board");
      }
    },
    [setWorkspaceBoards, setError],
  );

  /**
   * Check for local boards that need syncing on login
   */
  const checkLocalBoardsForSync = useCallback(async () => {
    if (!isAuthenticated) return;

    const localBoards = await LocalData.boards.getBoards();
    if (localBoards.length > 0) {
      const pendingBoards = localBoards.map((board) => ({
        id: board.id,
        name: board.name,
        elements: null, // Will be loaded when syncing
      }));
      setPendingSyncBoards(pendingBoards);
      setShowSyncDialog(true);
    }
  }, [isAuthenticated, setPendingSyncBoards, setShowSyncDialog]);

  /**
   * Sync local boards to a workspace (preserves original IDs)
   */
  const syncLocalBoardsToWorkspace = useCallback(
    async (targetWorkspaceId: string): Promise<void> => {
      if (!user?.uid || pendingSyncBoards.length === 0) return;

      setLoading(true);
      setError(null);

      try {
        for (const localBoard of pendingSyncBoards) {
          // Create board in Firestore with the SAME ID (preserving shareable links)
          await createFirestoreBoard(
            targetWorkspaceId,
            user.uid,
            localBoard.name,
            localBoard.id, // Preserve original ID
          );
        }

        // Reload workspace boards
        const boards = await getFirestoreBoards(targetWorkspaceId);
        setWorkspaceBoards((prev) => new Map(prev).set(targetWorkspaceId, boards));

        // Clear pending sync
        setPendingSyncBoards([]);
        setShowSyncDialog(false);
      } catch (err: any) {
        setError(err.message || "Failed to sync boards");
      } finally {
        setLoading(false);
      }
    },
    [user?.uid, pendingSyncBoards, setWorkspaceBoards, setPendingSyncBoards, setShowSyncDialog, setLoading, setError],
  );

  /**
   * Skip syncing local boards
   */
  const skipSync = useCallback(() => {
    setPendingSyncBoards([]);
    setShowSyncDialog(false);
  }, [setPendingSyncBoards, setShowSyncDialog]);

  /**
   * Get boards for a specific workspace
   */
  const getBoardsForWorkspace = useCallback(
    (workspaceId: string): FirestoreBoard[] => {
      return workspaceBoards.get(workspaceId) || [];
    },
    [workspaceBoards],
  );

  return {
    // State
    workspaces,
    currentWorkspace,
    workspaceBoards,
    loading,
    error,
    showSyncDialog,
    pendingSyncBoards,

    // Workspace actions
    loadWorkspaces,
    createWorkspace,
    renameWorkspace,
    removeWorkspace,
    selectWorkspace,

    // Board actions
    createBoard,
    renameBoard,
    removeBoard,
    getBoardsForWorkspace,

    // Sync actions
    checkLocalBoardsForSync,
    syncLocalBoardsToWorkspace,
    skipSync,
  };
};
