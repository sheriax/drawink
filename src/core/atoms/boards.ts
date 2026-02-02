import { atom } from "../editor-jotai";
import type { Board, BoardsAPI } from "../types";

// ============================================================================
// Core State Atoms (Private primitives + Public derived for jotai-scope compat)
// ============================================================================

/**
 * The BoardsAPI implementation provided by the host app.
 * This should be set once during app initialization.
 */
export const boardsAPIAtom = atom<BoardsAPI | null>(null);

/**
 * List of all boards.
 */
const _boardsAtom = atom<Board[]>([]);
export const boardsAtom = atom(
  (get) => get(_boardsAtom),
  (_get, set, value: Board[]) => set(_boardsAtom, value),
);

/**
 * ID of the currently active board.
 */
const _currentBoardIdAtom = atom<string | null>(null);
export const currentBoardIdAtom = atom(
  (get) => get(_currentBoardIdAtom),
  // @ts-expect-error - jotai-scope type inference limitation with primitive atoms
  (_get, set, value: string | null) => set(_currentBoardIdAtom, value),
);

/**
 * Loading state for board operations.
 */
const _isLoadingBoardsAtom = atom<boolean>(true);
export const isLoadingBoardsAtom = atom(
  (get) => get(_isLoadingBoardsAtom),
  (_get, set, value: boolean) => set(_isLoadingBoardsAtom, value),
);

/**
 * ID of the board currently being edited (for inline rename).
 */
const _editingBoardIdAtom = atom<string | null>(null);
export const editingBoardIdAtom = atom(
  (get) => get(_editingBoardIdAtom),
  // @ts-expect-error - jotai-scope type inference limitation with primitive atoms
  (_get, set, value: string | null) => set(_editingBoardIdAtom, value),
);

// ============================================================================
// Derived Atoms
// ============================================================================

/**
 * The currently active board object.
 */
export const currentBoardAtom = atom((get) => {
  const boards = get(_boardsAtom);
  const currentId = get(_currentBoardIdAtom);
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

  // @ts-ignore - jotai-scope type inference limitation
  set(_isLoadingBoardsAtom, true);
  try {
    const [boards, currentId] = await Promise.all([api.getBoards(), api.getCurrentBoardId()]);
    // @ts-ignore - jotai-scope type inference limitation
    set(_boardsAtom, boards);
    // @ts-ignore - jotai-scope type inference limitation
    set(_currentBoardIdAtom, currentId);
  } catch (error) {
    console.error("Failed to load boards", error);
  } finally {
    // @ts-ignore - jotai-scope type inference limitation
    set(_isLoadingBoardsAtom, false);
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
  const currentId = get(_currentBoardIdAtom);

  if (!api || boardId === currentId) {
    return;
  }

  try {
    await api.switchBoard(boardId);
    // @ts-ignore - jotai-scope type inference limitation
    set(_currentBoardIdAtom, boardId);

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
      // @ts-ignore - jotai-scope type inference limitation
      set(_editingBoardIdAtom, null);
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
