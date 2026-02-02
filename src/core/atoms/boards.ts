import { atom } from "../editor-jotai";
import type { Board, BoardsAPI } from "../types";

// ============================================================================
// Core State Atoms
// ============================================================================

/**
 * The BoardsAPI implementation provided by the host app.
 * This should be set once during app initialization.
 */
export const boardsAPIAtom = atom<BoardsAPI | null>(null);

/**
 * List of all boards.
 */
export const boardsAtom = atom<Board[]>([]);

/**
 * ID of the currently active board.
 */
export const currentBoardIdAtom = atom<string | null>(null);

/**
 * Loading state for board operations.
 */
export const isLoadingBoardsAtom = atom<boolean>(true);

/**
 * ID of the board currently being edited (for inline rename).
 */
export const editingBoardIdAtom = atom<string | null>(null);

// ============================================================================
// Derived Atoms
// ============================================================================

/**
 * The currently active board object.
 */
export const currentBoardAtom = atom((get) => {
  const boards = get(boardsAtom);
  const currentId = get(currentBoardIdAtom);
  return boards.find((b) => b.id === currentId) || null;
});

// ============================================================================
// Action Atoms
// ============================================================================

/**
 * Refresh the boards list from the API.
 */
export const refreshBoardsAtom = atom(null, async (get, set) => {
  const api = get(boardsAPIAtom);
  if (!api) {
    return;
  }

  set(isLoadingBoardsAtom, true);
  try {
    const [boards, currentId] = await Promise.all([api.getBoards(), api.getCurrentBoardId()]);
    set(boardsAtom, boards);
    set(currentBoardIdAtom, currentId);
  } catch (error) {
    console.error("Failed to load boards", error);
  } finally {
    set(isLoadingBoardsAtom, false);
  }
});

/**
 * Create a new board with the given name.
 */
export const createBoardAtom = atom(null, async (get, set, name: string) => {
  const api = get(boardsAPIAtom);
  if (!api) {
    return;
  }

  try {
    await api.createBoard(name);
    // Refresh the boards list
    const refreshBoards = set(refreshBoardsAtom);
    await refreshBoards;
  } catch (error) {
    console.error("Failed to create board", error);
  }
});

/**
 * Switch to a different board.
 * Emits a custom event that the app can listen to for scene updates.
 */
export const switchBoardAtom = atom(null, async (get, set, boardId: string) => {
  const api = get(boardsAPIAtom);
  const currentId = get(currentBoardIdAtom);

  if (!api || boardId === currentId) {
    return;
  }

  try {
    await api.switchBoard(boardId);
    set(currentBoardIdAtom, boardId);

    // Emit event for scene update - App.tsx will handle this
    window.dispatchEvent(
      new CustomEvent("drawink-board-switch", {
        detail: { boardId },
      }),
    );
  } catch (error) {
    console.error("Failed to switch board", error);
  }
});

/**
 * Update the name of a board.
 */
export const updateBoardNameAtom = atom(
  null,
  async (get, set, { id, name }: { id: string; name: string }) => {
    const api = get(boardsAPIAtom);
    if (!api) {
      return;
    }

    try {
      await api.updateBoardName(id, name);
      set(editingBoardIdAtom, null);
      // Refresh the boards list
      const refreshBoards = set(refreshBoardsAtom);
      await refreshBoards;
    } catch (error) {
      console.error("Failed to update board name", error);
    }
  },
);

/**
 * Delete a board.
 */
export const deleteBoardAtom = atom(null, async (get, set, boardId: string) => {
  const api = get(boardsAPIAtom);
  if (!api) {
    return;
  }

  try {
    await api.deleteBoard(boardId);
    // Refresh the boards list
    const refreshBoards = set(refreshBoardsAtom);
    await refreshBoards;
  } catch (error) {
    console.error("Failed to delete board", error);
  }
});
