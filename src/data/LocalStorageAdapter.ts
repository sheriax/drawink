/**
 * LocalStorageAdapter
 *
 * Implements all local storage operations:
 * - Board management (localStorage)
 * - Scene/element storage (localStorage)
 * - File storage (IndexedDB)
 * - Library storage (IndexedDB)
 */

import { clearAppStateForLocalStorage } from "@/core/appState";
import { CANVAS_SEARCH_TAB, DEFAULT_SIDEBAR, debounce, randomId } from "@/lib/common";
import { getNonDeletedElements } from "@/lib/elements";
import { createStore, del, entries, get, getMany, set, setMany } from "idb-keyval";

import { appJotaiStore, atom } from "../app-jotai";

import type { LibraryPersistedData } from "@/core/data/library";
import type { ImportedDataState } from "@/core/data/types";
import type { BoardContent, StorageAdapter } from "@/core/storage/types";
import type { AppState, BinaryFileData, BinaryFiles, Board } from "@/core/types";
import type { MaybePromise } from "@/lib/common/utility-types";
import type { DrawinkElement, FileId } from "@/lib/elements/types";

import { SAVE_TO_LOCAL_STORAGE_TIMEOUT, STORAGE_KEYS } from "../app_constants";
import { FileManager } from "./FileManager";
import { Locker } from "./Locker";
import { updateBrowserStateVersion } from "./tabSync";

// ============================================================================
// IndexedDB Stores
// ============================================================================

const filesStore = createStore("files-db", "files-store");
const libraryStore = createStore(
  `${STORAGE_KEYS.IDB_LIBRARY}-db`,
  `${STORAGE_KEYS.IDB_LIBRARY}-store`,
);

// ============================================================================
// Atoms
// ============================================================================

export const localStorageQuotaExceededAtom = atom(false);

// ============================================================================
// File Manager
// ============================================================================

class LocalFileManager extends FileManager {
  clearObsoleteFiles = async (opts: { currentFileIds: FileId[] }) => {
    await entries(filesStore).then((entries) => {
      for (const [id, imageData] of entries as [FileId, BinaryFileData][]) {
        if (
          (!imageData.lastRetrieved || Date.now() - imageData.lastRetrieved > 24 * 3600 * 1000) &&
          !opts.currentFileIds.includes(id as FileId)
        ) {
          del(id, filesStore);
        }
      }
    });
  };
}

// ============================================================================
// Types
// ============================================================================

type SavingLockTypes = "collaboration";

// ============================================================================
// LocalStorageAdapter
// ============================================================================

/**
 * Storage adapter that persists data to browser localStorage and IndexedDB.
 * Provides instant, synchronous access to board data.
 */
export class LocalStorageAdapter implements StorageAdapter {
  // Save pausing via Locker
  private locker = new Locker<SavingLockTypes>();

  // =========================================================================
  // File Storage
  // =========================================================================

  /**
   * File storage manager for images and other files (IndexedDB)
   */
  fileStorage = new LocalFileManager({
    getFiles: (ids) => {
      return getMany(ids, filesStore).then(async (filesData: (BinaryFileData | undefined)[]) => {
        const loadedFiles: BinaryFileData[] = [];
        const erroredFiles = new Map<FileId, true>();
        const filesToSave: [FileId, BinaryFileData][] = [];

        filesData.forEach((data, index) => {
          const id = ids[index];
          if (data) {
            const _data: BinaryFileData = {
              ...data,
              lastRetrieved: Date.now(),
            };
            filesToSave.push([id, _data]);
            loadedFiles.push(_data);
          } else {
            erroredFiles.set(id, true);
          }
        });

        try {
          setMany(filesToSave, filesStore);
        } catch (error) {
          console.warn(error);
        }

        return { loadedFiles, erroredFiles };
      });
    },
    async saveFiles({ addedFiles }) {
      const savedFiles = new Map<FileId, BinaryFileData>();
      const erroredFiles = new Map<FileId, BinaryFileData>();

      updateBrowserStateVersion(STORAGE_KEYS.VERSION_FILES);

      await Promise.all(
        [...addedFiles].map(async ([id, fileData]) => {
          try {
            await set(id, fileData, filesStore);
            savedFiles.set(id, fileData);
          } catch (error: any) {
            console.error(error);
            erroredFiles.set(id, fileData);
          }
        }),
      );

      return { savedFiles, erroredFiles };
    },
  });

  // =========================================================================
  // Scene Save Methods
  // =========================================================================

  /**
   * Debounced save function
   */
  private _save = debounce(
    async (
      elements: readonly DrawinkElement[],
      appState: AppState,
      files: BinaryFiles,
      onFilesSaved: () => void,
    ) => {
      this.saveSceneData(elements, appState);

      await this.fileStorage.saveFiles({
        elements,
        files,
      });
      onFilesSaved();
    },
    SAVE_TO_LOCAL_STORAGE_TIMEOUT,
  );

  /**
   * Save scene state. Bails if saving is paused.
   */
  save = (
    elements: readonly DrawinkElement[],
    appState: AppState,
    files: BinaryFiles,
    onFilesSaved: () => void,
  ) => {
    if (!this.isSavePaused()) {
      this._save(elements, appState, files, onFilesSaved);
    }
  };

  /**
   * Flush pending saves immediately
   */
  flushSave = () => {
    this._save.flush();
  };

  /**
   * Pause saving (used during collaboration)
   */
  pauseSave = (lockType: SavingLockTypes) => {
    this.locker.lock(lockType);
  };

  /**
   * Resume saving
   */
  resumeSave = (lockType: SavingLockTypes) => {
    this.locker.unlock(lockType);
  };

  /**
   * Check if saving is paused
   */
  isSavePaused = () => {
    return document.hidden || this.locker.isLocked();
  };

  /**
   * Save scene data to localStorage
   */
  saveSceneData = (elements: readonly DrawinkElement[], appState: AppState) => {
    const localStorageQuotaExceeded = appJotaiStore.get(localStorageQuotaExceededAtom);
    try {
      const _appState = clearAppStateForLocalStorage(appState);

      if (
        _appState.openSidebar?.name === DEFAULT_SIDEBAR.name &&
        _appState.openSidebar.tab === CANVAS_SEARCH_TAB
      ) {
        _appState.openSidebar = null;
      }

      const currentBoardId = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_CURRENT_BOARD_ID);
      const elementsKey = currentBoardId
        ? `drawink-board-${currentBoardId}-elements`
        : STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS;
      const stateKey = currentBoardId
        ? `drawink-board-${currentBoardId}-state`
        : STORAGE_KEYS.LOCAL_STORAGE_APP_STATE;

      localStorage.setItem(elementsKey, JSON.stringify(getNonDeletedElements(elements)));
      localStorage.setItem(stateKey, JSON.stringify(_appState));
      updateBrowserStateVersion(STORAGE_KEYS.VERSION_DATA_STATE);
      if (localStorageQuotaExceeded) {
        appJotaiStore.set(localStorageQuotaExceededAtom, false);
      }
    } catch (error: any) {
      console.error(error);
      if (this.isQuotaExceededError(error) && !localStorageQuotaExceeded) {
        appJotaiStore.set(localStorageQuotaExceededAtom, true);
      }
    }
  };

  private isQuotaExceededError = (error: any) => {
    return error instanceof DOMException && error.name === "QuotaExceededError";
  };

  // =========================================================================
  // Board Management
  // =========================================================================

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
    localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_BOARDS, JSON.stringify(boards));
    return newBoard.id;
  }

  /**
   * Create a board with a specific ID (used for sync operations)
   * Returns the board ID.
   */
  async createBoardWithId(id: string, name: string): Promise<string> {
    const boards = await this.getBoards();

    // Check if board already exists
    if (boards.some((b) => b.id === id)) {
      return id;
    }

    const newBoard: Board = {
      id,
      name,
      createdAt: Date.now(),
      lastModified: Date.now(),
    };
    boards.push(newBoard);
    localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_BOARDS, JSON.stringify(boards));

    return id;
  }

  /**
   * Update a board's metadata
   */
  async updateBoard(id: string, data: Partial<Board>): Promise<void> {
    const boards = await this.getBoards();
    const board = boards.find((b) => b.id === id);
    if (board) {
      Object.assign(board, data, { lastModified: Date.now() });
      localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_BOARDS, JSON.stringify(boards));
    }
  }

  /**
   * Delete a board and its associated data
   */
  async deleteBoard(id: string): Promise<void> {
    const boards = await this.getBoards();
    const board = boards.find((b) => b.id === id);
    const newBoards = boards.filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_BOARDS, JSON.stringify(newBoards));
    // Clean up associated data
    localStorage.removeItem(`drawink-board-${id}-elements`);
    localStorage.removeItem(`drawink-board-${id}-state`);
    localStorage.removeItem(`drawink-board-${id}-version`);
    // Track as deleted to prevent re-sync from uploading this board again
    this.addDeletedBoardId(id);
    // Also track cloudId if present
    if (board?.cloudId) {
      this.addDeletedBoardId(board.cloudId);
    }
  }

  // =========================================================================
  // Deleted Board Tracking (prevents re-sync of deleted boards)
  // =========================================================================

  /**
   * Get list of board IDs that have been explicitly deleted.
   * SyncEngine uses this to avoid re-uploading deleted boards.
   */
  getDeletedBoardIds(): string[] {
    try {
      const ids = localStorage.getItem("drawink-deleted-boards");
      return ids ? JSON.parse(ids) : [];
    } catch {
      return [];
    }
  }

  /**
   * Track a board ID as deleted to prevent re-sync
   */
  addDeletedBoardId(id: string): void {
    const ids = this.getDeletedBoardIds();
    if (!ids.includes(id)) {
      ids.push(id);
      // Keep only the last 100 deleted IDs to prevent unbounded growth
      const trimmedIds = ids.slice(-100);
      localStorage.setItem("drawink-deleted-boards", JSON.stringify(trimmedIds));
    }
  }

  /**
   * Clear the deleted board IDs list (used after full re-sync)
   */
  clearDeletedBoardIds(): void {
    localStorage.removeItem("drawink-deleted-boards");
  }

  // =========================================================================
  // Cache Management (for cloud-first architecture)
  // =========================================================================

  /**
   * Replace entire board cache with cloud boards (cloud is truth)
   */
  async updateBoardCache(boards: Board[]): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_BOARDS, JSON.stringify(boards));
    localStorage.setItem("drawink-last-sync", Date.now().toString());
  }

  /**
   * Clear all cached board data (used on logout for security)
   */
  async clearCache(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.LOCAL_STORAGE_BOARDS);
    localStorage.removeItem("drawink-last-sync");
    localStorage.removeItem("drawink-deleted-boards");
    localStorage.removeItem(STORAGE_KEYS.LOCAL_STORAGE_CURRENT_BOARD_ID);
  }

  /**
   * Mark a board as pending delete (for offline delete queuing)
   */
  async markBoardPendingDelete(id: string): Promise<void> {
    const boards = await this.getBoards();
    const board = boards.find((b) => b.id === id);
    if (board) {
      (board as any).pendingDelete = true;
      localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_BOARDS, JSON.stringify(boards));
    }
  }

  /**
   * Get last sync timestamp
   */
  getLastSyncTimestamp(): number | null {
    const timestamp = localStorage.getItem("drawink-last-sync");
    return timestamp ? parseInt(timestamp, 10) : null;
  }

  /**
   * Get the current board ID
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

  // =========================================================================
  // Board Content
  // =========================================================================

  /**
   * Get the content of a board
   */
  async getBoardContent(boardId: string): Promise<BoardContent> {
    const elementsKey = `drawink-board-${boardId}-elements`;
    const stateKey = `drawink-board-${boardId}-state`;
    const versionKey = `drawink-board-${boardId}-version`;

    let elements: DrawinkElement[] = [];
    let appState = {};
    let version = 0;

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

    try {
      const savedVersion = localStorage.getItem(versionKey);
      if (savedVersion) {
        version = Number.parseInt(savedVersion, 10) || 0;
      }
    } catch (error) {
      console.error("Failed to load board version", error);
    }

    return { elements, appState, version };
  }

  /**
   * Save the content of a board
   */
  async saveBoardContent(boardId: string, content: BoardContent): Promise<void> {
    const elementsKey = `drawink-board-${boardId}-elements`;
    const stateKey = `drawink-board-${boardId}-state`;
    const versionKey = `drawink-board-${boardId}-version`;

    try {
      localStorage.setItem(elementsKey, JSON.stringify(content.elements));
      localStorage.setItem(stateKey, JSON.stringify(content.appState));

      // Update version
      const newVersion = (content.version || 0) + 1;
      localStorage.setItem(versionKey, String(newVersion));

      // Update board's lastModified
      const boards = await this.getBoards();
      const board = boards.find((b) => b.id === boardId);
      if (board) {
        board.lastModified = Date.now();
        localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_BOARDS, JSON.stringify(boards));
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

// ============================================================================
// Library Adapters
// ============================================================================

/**
 * Library adapter using IndexedDB
 */
export class LibraryIndexedDBAdapter {
  private static key = "libraryData";

  static async load() {
    const IDBData = await get<LibraryPersistedData>(LibraryIndexedDBAdapter.key, libraryStore);
    return IDBData || null;
  }

  static save(data: LibraryPersistedData): MaybePromise<void> {
    return set(LibraryIndexedDBAdapter.key, data, libraryStore);
  }
}

/**
 * LS Adapter used only for migrating LS library data to indexedDB
 */
export class LibraryLocalStorageMigrationAdapter {
  static load() {
    const LSData = localStorage.getItem(STORAGE_KEYS.__LEGACY_LOCAL_STORAGE_LIBRARY);
    if (LSData != null) {
      const libraryItems: ImportedDataState["libraryItems"] = JSON.parse(LSData);
      if (libraryItems) {
        return { libraryItems };
      }
    }
    return null;
  }
  static clear() {
    localStorage.removeItem(STORAGE_KEYS.__LEGACY_LOCAL_STORAGE_LIBRARY);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const localStorageAdapter = new LocalStorageAdapter();
