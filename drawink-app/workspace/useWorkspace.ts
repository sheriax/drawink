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
  LOCAL_WORKSPACE_ID,
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

  const LOCAL_WORKSPACE: Workspace = {
    id: LOCAL_WORKSPACE_ID,
    userId: "local",
    name: "Local",
    createdAt: 0,
    lastModified: 0,
  };

  /**
   * Load all workspaces for the current user
   */
  const loadWorkspaces = useCallback(async () => {
    // Always include Local workspace if not authenticated (or maybe always?)
    // Requirement: "unAuthenticated user... can only one workspace that is saved locally"
    // Requirement: "Authenticated user... Can have multiple workspace" (and "Local" is implied as "Unauthenticated"? Or does Auth user see Local? "active workspace name... for unauthenticated it will only show 'Local'")
    // Let's assume Auth users only see their cloud workspaces, OR they see Local + Cloud?
    // "Can user this app without restriction but they can only one workspace that is saved locally." implies Local is the fallback.
    // "Authenticated user... Can have multiple workspace... can select a workspace".
    // I will implement: Auth users see their Cloud Workspaces. Unauth see [Local].

    if (!isAuthenticated || !user?.uid) {
      setWorkspaces([LOCAL_WORKSPACE]);
      setCurrentWorkspace(LOCAL_WORKSPACE);
      // Load local boards into workspaceBoards
      const localBoards = await LocalData.boards.getBoards();
      const firestoreLikeBoards = localBoards.map(b => ({
        id: b.id,
        workspaceId: LOCAL_WORKSPACE_ID,
        userId: "local",
        name: b.name,
        createdAt: b.createdAt,
        lastModified: b.lastModified,
        size: b.size,
      } as FirestoreBoard));

      setWorkspaceBoards(new Map([[LOCAL_WORKSPACE_ID, firestoreLikeBoards]]));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userWorkspaces = await getWorkspacesApi(user.uid);
      setWorkspaces(userWorkspaces);

      // If current workspace is not in the list (or null), select the first one
      if (userWorkspaces.length > 0 && (!currentWorkspace || currentWorkspace.id === LOCAL_WORKSPACE_ID || !userWorkspaces.find(w => w.id === currentWorkspace.id))) {
        setCurrentWorkspace(userWorkspaces[0]);
      }

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
  }, [user?.uid, isAuthenticated, setWorkspaces, setCurrentWorkspace, setWorkspaceBoards, setLoading, setError]);

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
        setCurrentWorkspace(workspace); // Auto select new workspace
        return workspace;
      } catch (err: any) {
        setError(err.message || "Failed to create workspace");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.uid, setWorkspaces, setWorkspaceBoards, setCurrentWorkspace, setLoading, setError],
  );

  /**
   * Rename a workspace
   */
  const renameWorkspace = useCallback(
    async (workspaceId: string, name: string): Promise<void> => {
      setError(null);

      if (workspaceId === LOCAL_WORKSPACE_ID) return; // Cannot rename Local

      try {
        await updateWorkspaceApi(workspaceId, { name });
        setWorkspaces((prev) =>
          prev.map((w) =>
            w.id === workspaceId ? { ...w, name, lastModified: Date.now() } : w,
          ),
        );
        if (currentWorkspace?.id === workspaceId) {
          setCurrentWorkspace(prev => prev ? { ...prev, name } : null);
        }
      } catch (err: any) {
        setError(err.message || "Failed to rename workspace");
      }
    },
    [setWorkspaces, currentWorkspace, setCurrentWorkspace, setError],
  );

  /**
   * Delete a workspace and all its boards
   */
  const removeWorkspace = useCallback(
    async (workspaceId: string): Promise<void> => {
      if (workspaceId === LOCAL_WORKSPACE_ID) return;

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
          // Select another workspace if available
          setWorkspaces(prev => {
            if (prev.length > 0) setCurrentWorkspace(prev[0]);
            else setCurrentWorkspace(null);
            return prev;
          });
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
   * Select a workspace and set up the first board (or create one if empty)
   * This stores workspace/board info in localStorage and triggers a page reload
   * so the board data can be loaded fresh.
   */
  const selectWorkspace = useCallback(
    async (workspaceId: string): Promise<void> => {
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace) return;

      setCurrentWorkspace(workspace);

      // For local workspace, just set it and let existing local board logic handle it
      if (workspaceId === LOCAL_WORKSPACE_ID) {
        localStorage.removeItem("drawink-currentBoardId");
        localStorage.removeItem("drawink-currentWorkspaceId");
        return;
      }

      // For cloud workspaces, get the boards and set the first one as active
      const boards = workspaceBoards.get(workspaceId) || [];

      if (boards.length > 0) {
        // Set the first board as the current board
        const firstBoard = boards[0];
        localStorage.setItem("drawink-currentBoardId", firstBoard.id);
        localStorage.setItem("drawink-currentWorkspaceId", workspaceId);

        // Reload to load the board data
        window.location.reload();
      } else {
        // Workspace is empty - we'll create a board when user actually saves
        // For now, just set the workspace
        localStorage.setItem("drawink-currentWorkspaceId", workspaceId);
        localStorage.removeItem("drawink-currentBoardId");
      }
    },
    [workspaces, workspaceBoards, setCurrentWorkspace],
  );


  /**
   * Create a new board in a workspace
   */
  const createBoard = useCallback(
    async (workspaceId: string, name: string, existingBoardId?: string): Promise<FirestoreBoard | null> => {
      setError(null);

      if (workspaceId === LOCAL_WORKSPACE_ID) {
        try {
          // Local creation
          const id = await LocalData.boards.createBoard(name);
          const boards = await LocalData.boards.getBoards();
          const newBoard = boards.find(b => b.id === id);
          if (newBoard) {
            const firestoreLikeBoard = {
              id: newBoard.id,
              workspaceId: LOCAL_WORKSPACE_ID,
              userId: "local",
              name: newBoard.name,
              createdAt: newBoard.createdAt,
              lastModified: newBoard.lastModified,
              size: newBoard.size
            } as FirestoreBoard;

            setWorkspaceBoards((prev) => {
              const newMap = new Map(prev);
              const existing = newMap.get(LOCAL_WORKSPACE_ID) || [];
              newMap.set(LOCAL_WORKSPACE_ID, [firestoreLikeBoard, ...existing]);
              return newMap;
            });
            return firestoreLikeBoard;
          }
          return null;
        } catch (e: any) {
          setError(e.message);
          return null;
        }
      }

      if (!user?.uid) return null;

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

      if (workspaceId === LOCAL_WORKSPACE_ID) {
        await LocalData.boards.updateBoardName(boardId, name);
        setWorkspaceBoards((prev) => {
          const newMap = new Map(prev);
          const boards = newMap.get(LOCAL_WORKSPACE_ID) || [];
          newMap.set(
            LOCAL_WORKSPACE_ID,
            boards.map((b) =>
              b.id === boardId ? { ...b, name, lastModified: Date.now() } : b,
            ),
          );
          return newMap;
        });
        return;
      }

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

      if (workspaceId === LOCAL_WORKSPACE_ID) {
        await LocalData.boards.deleteBoard(boardId);
        setWorkspaceBoards((prev) => {
          const newMap = new Map(prev);
          const boards = newMap.get(LOCAL_WORKSPACE_ID) || [];
          newMap.set(
            LOCAL_WORKSPACE_ID,
            boards.filter((b) => b.id !== boardId),
          );
          return newMap;
        });
        return;
      }

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

  /**
   * Switch to a specific board (for local boards, updates localStorage; for cloud boards, just returns the board ID for the caller to handle)
   */
  const switchBoard = useCallback(
    async (boardId: string, workspaceId: string): Promise<void> => {
      try {
        if (workspaceId === LOCAL_WORKSPACE_ID) {
          // For local boards, update localStorage to track the "current" board
          await LocalData.boards.switchBoard(boardId);
          // The app will need to reload/respond to this change
        }
        // For cloud boards, the caller (UI component) should handle loading the board content
        // This hook doesn't have access to drawinkAPI to update the scene directly
      } catch (e) {
        console.error("Failed to switch board:", e);
      }
    },
    []
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
    switchBoard,

    // Sync actions
    checkLocalBoardsForSync,
    syncLocalBoardsToWorkspace,
    skipSync,
  };
};

