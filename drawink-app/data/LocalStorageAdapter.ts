/**
 * LocalStorageAdapter
 *
 * Implements the StorageAdapter interface for browser localStorage.
 * This is the primary storage mechanism for anonymous (non-logged-in) users.
 */

import { randomId } from "@drawink/common";

import type { DrawinkElement } from "@drawink/element/types";
import type { Board } from "@drawink/drawink/types";
import type {
  StorageAdapter,
  BoardContent,
} from "@drawink/drawink/storage/types";

import { STORAGE_KEYS } from "../app_constants";

/**
 * Storage adapter that persists data to browser localStorage.
 * Provides instant, synchronous access to board data.
 */
export class LocalStorageAdapter implements StorageAdapter {
  /**
   * Get all boards from localStorage
   */
  async getBoards(): Promise<Board[]> {
    try {
      const boards = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_BOARDS);
      return boards ? JSON.parse(boards) : [];
    } catch (error) {
      console.error("Failed to get boards from localStorage", error);
      return [];
    }
  }

  /**
   * Create a new board with auto-generated ID
   */
  async createBoard(name: string): Promise<string> {
    const boards = await this.getBoards();
    const newBoard: Board = {
      id: randomId(),
      name,
      createdAt: Date.now(),
      lastModified: Date.now(),
    };
    boards.push(newBoard);
    localStorage.setItem(
      STORAGE_KEYS.LOCAL_STORAGE_BOARDS,
      JSON.stringify(boards),
    );
    return newBoard.id;
  }

  /**
   * Create a board with a specific ID (used for sync operations)
   */
  async createBoardWithId(id: string, name: string): Promise<void> {
    const boards = await this.getBoards();

    // Check if board already exists
    if (boards.some((b) => b.id === id)) {
      return;
    }

    const newBoard: Board = {
      id,
      name,
      createdAt: Date.now(),
      lastModified: Date.now(),
    };
    boards.push(newBoard);
    localStorage.setItem(
      STORAGE_KEYS.LOCAL_STORAGE_BOARDS,
      JSON.stringify(boards),
    );
  }

  /**
   * Update a board's metadata
   */
  async updateBoard(id: string, data: Partial<Board>): Promise<void> {
    const boards = await this.getBoards();
    const board = boards.find((b) => b.id === id);
    if (board) {
      Object.assign(board, data, { lastModified: Date.now() });
      localStorage.setItem(
        STORAGE_KEYS.LOCAL_STORAGE_BOARDS,
        JSON.stringify(boards),
      );
    }
  }

  /**
   * Delete a board and its associated data
   */
  async deleteBoard(id: string): Promise<void> {
    const boards = await this.getBoards();
    const newBoards = boards.filter((b) => b.id !== id);
    localStorage.setItem(
      STORAGE_KEYS.LOCAL_STORAGE_BOARDS,
      JSON.stringify(newBoards),
    );
    // Clean up board-specific data
    localStorage.removeItem(`drawink-board-${id}-elements`);
    localStorage.removeItem(`drawink-board-${id}-state`);
  }

  /**
   * Get the currently active board ID
   */
  async getCurrentBoardId(): Promise<string | null> {
    return localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_CURRENT_BOARD_ID);
  }

  /**
   * Set the current board ID
   */
  async setCurrentBoardId(id: string): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_CURRENT_BOARD_ID, id);
  }

  /**
   * Get the content (elements and appState) of a specific board
   */
  async getBoardContent(boardId: string): Promise<BoardContent> {
    const elementsKey = `drawink-board-${boardId}-elements`;
    const stateKey = `drawink-board-${boardId}-state`;

    let elements: DrawinkElement[] = [];
    let appState = {};

    try {
      const savedElements = localStorage.getItem(elementsKey);
      if (savedElements) {
        elements = JSON.parse(savedElements);
      }
    } catch (error) {
      console.error("Failed to load board elements", error);
    }

    try {
      const savedState = localStorage.getItem(stateKey);
      if (savedState) {
        appState = JSON.parse(savedState);
      }
    } catch (error) {
      console.error("Failed to load board state", error);
    }

    return { elements, appState };
  }

  /**
   * Save the content (elements and appState) of a specific board
   */
  async saveBoardContent(boardId: string, content: BoardContent): Promise<void> {
    const elementsKey = `drawink-board-${boardId}-elements`;
    const stateKey = `drawink-board-${boardId}-state`;

    try {
      localStorage.setItem(elementsKey, JSON.stringify(content.elements));
      localStorage.setItem(stateKey, JSON.stringify(content.appState));

      // Update the board's lastModified timestamp
      const boards = await this.getBoards();
      const board = boards.find((b) => b.id === boardId);
      if (board) {
        board.lastModified = Date.now();
        localStorage.setItem(
          STORAGE_KEYS.LOCAL_STORAGE_BOARDS,
          JSON.stringify(boards),
        );
      }
    } catch (error) {
      console.error("Failed to save board content", error);
      throw error;
    }
  }

  /**
   * Load board data (used by App.tsx for board switching)
   * This is a synchronous convenience method.
   */
  loadBoardData(boardId: string): { elements: DrawinkElement[]; appState: any } {
    const elementsKey = `drawink-board-${boardId}-elements`;
    const stateKey = `drawink-board-${boardId}-state`;

    let elements: DrawinkElement[] = [];
    let appState = null;

    try {
      const savedElements = localStorage.getItem(elementsKey);
      if (savedElements) {
        elements = JSON.parse(savedElements);
      }
    } catch (error) {
      console.error("Failed to load board elements", error);
    }

    try {
      const savedState = localStorage.getItem(stateKey);
      if (savedState) {
        appState = JSON.parse(savedState);
      }
    } catch (error) {
      console.error("Failed to load board state", error);
    }

    return { elements, appState };
  }
}

// Export a singleton instance for convenience
export const localStorageAdapter = new LocalStorageAdapter();
