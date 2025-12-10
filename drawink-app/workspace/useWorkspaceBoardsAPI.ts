import { useCallback } from "react";
import { useAuth } from "../auth";
import { useWorkspace } from "./useWorkspace";
import { LocalData } from "../data/LocalData";
import {
  getFirestoreBoards,
  createFirestoreBoard,
  updateFirestoreBoard,
  deleteFirestoreBoard,
  saveBoardContentToFirestore,
  loadBoardContentFromFirestore,
  type FirestoreBoard,
} from "../data/firebase";
import { LOCAL_WORKSPACE_ID } from "./workspaceAtom";

import type { BoardsAPI, Board } from "@drawink/drawink/types";

/**
 * Creates a workspace-aware BoardsAPI that can be passed to the Drawink component.
 * This bridges the workspace system with the existing BoardsMenu component.
 */
export const useWorkspaceBoardsAPI = (): BoardsAPI | undefined => {
  const { user } = useAuth();
  const { currentWorkspace, workspaceBoards, createBoard, renameBoard, removeBoard, getBoardsForWorkspace } = useWorkspace();

  const getBoards = useCallback(async (): Promise<Board[]> => {
    if (!currentWorkspace) return [];

    if (currentWorkspace.id === LOCAL_WORKSPACE_ID) {
      return LocalData.boards.getBoards();
    }

    // For cloud workspaces, return cached boards from workspace state
    const boards = getBoardsForWorkspace(currentWorkspace.id);
    return boards.map(b => ({
      id: b.id,
      name: b.name,
      createdAt: b.createdAt,
      lastModified: b.lastModified,
      size: b.size,
    }));
  }, [currentWorkspace, getBoardsForWorkspace]);

  const getCurrentBoardId = useCallback(async (): Promise<string | null> => {
    // For now, we store current board ID in localStorage regardless of workspace
    return localStorage.getItem("drawink-currentBoardId") || null;
  }, []);

  const switchBoardFn = useCallback(async (id: string): Promise<void> => {
    if (!currentWorkspace) return;

    if (currentWorkspace.id === LOCAL_WORKSPACE_ID) {
      await LocalData.boards.switchBoard(id);
      // The app will reload to show the new board
      window.location.reload();
    } else {
      // For cloud boards, we need to:
      // 1. Store the board ID
      // 2. Load board content (if available) - this requires drawinkAPI
      // For now, just store the ID - the canvas loading will be handled separately
      localStorage.setItem("drawink-currentBoardId", id);
      localStorage.setItem("drawink-currentWorkspaceId", currentWorkspace.id);
      window.location.reload();
    }
  }, [currentWorkspace]);

  const createBoardFn = useCallback(async (name: string): Promise<string> => {
    if (!currentWorkspace) throw new Error("No workspace selected");

    const board = await createBoard(currentWorkspace.id, name);
    if (!board) throw new Error("Failed to create board");
    return board.id;
  }, [currentWorkspace, createBoard]);

  const deleteBoardFn = useCallback(async (id: string): Promise<void> => {
    if (!currentWorkspace) return;
    await removeBoard(id, currentWorkspace.id);
  }, [currentWorkspace, removeBoard]);

  const updateBoardNameFn = useCallback(async (id: string, name: string): Promise<void> => {
    if (!currentWorkspace) return;
    await renameBoard(id, currentWorkspace.id, name);
  }, [currentWorkspace, renameBoard]);

  // Only return the API if we have a current workspace
  if (!currentWorkspace) {
    return undefined;
  }

  return {
    getBoards,
    getCurrentBoardId,
    switchBoard: switchBoardFn,
    createBoard: createBoardFn,
    deleteBoard: deleteBoardFn,
    updateBoardName: updateBoardNameFn,
  };
};
