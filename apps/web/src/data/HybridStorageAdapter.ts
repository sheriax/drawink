/**
 * HybridStorageAdapter
 *
 * The main storage interface for Drawink that orchestrates local and cloud storage.
 * Follows a local-first approach: always reads from local first for instant response,
 * then syncs with cloud in the background when authenticated.
 *
 * This is the ONLY file that calls LocalStorageAdapter and CloudStorageAdapter.
 */

import type {
  BoardContent,
  StorageAdapter,
  SyncStatus,
  Workspace,
} from "@drawink/drawink/storage/types";
import type { AppState, BinaryFiles, Board, BoardsAPI } from "@drawink/drawink/types";
import type { DrawinkElement } from "@drawink/element/types";

import { CloudStorageAdapter } from "./CloudStorageAdapter";
import { type LocalStorageAdapter, localStorageAdapter } from "./LocalStorageAdapter";
import { SyncEngine } from "./SyncEngine";

/**
 * HybridStorageAdapter orchestrates between local and cloud storage.
 * - For anonymous users: only local storage is used
 * - For authenticated users: local-first with background cloud sync
 *
 * Also implements BoardsAPI for use as the boards atom provider.
 */
export class HybridStorageAdapter implements StorageAdapter, BoardsAPI {
  private localAdapter: LocalStorageAdapter;
  private cloudAdapter: CloudStorageAdapter | null = null;
  private syncEngine: SyncEngine | null = null;

  private _cloudEnabled = false;
  private _userId: string | null = null;
  private _syncStatus: SyncStatus = "idle";
  private _onSyncStatusChange: ((status: SyncStatus) => void) | null = null;

  constructor(localAdapter?: LocalStorageAdapter) {
    this.localAdapter = localAdapter || localStorageAdapter;
  }

  // =========================================================================
  // Passthrough to LocalStorageAdapter
  // =========================================================================

  /**
   * Get the local file storage manager
   */
  get fileStorage() {
    return this.localAdapter.fileStorage;
  }

  /**
   * Save scene state. Calls local first, then syncs to cloud.
   */
  save = (
    elements: readonly DrawinkElement[],
    appState: AppState,
    files: BinaryFiles,
    onFilesSaved: () => void,
  ) => {
    // Save locally
    this.localAdapter.save(elements, appState, files, () => {
      onFilesSaved();

      // Trigger cloud sync for current board content
      if (this.cloudAdapter && this.syncEngine) {
        this.localAdapter.getCurrentBoardId().then((boardId) => {
          if (boardId) {
            this.syncEngine!.scheduleBoardContentSync(boardId);
          }
        });
      }
    });
  };

  /**
   * Flush pending saves immediately
   */
  flushSave = () => {
    this.localAdapter.flushSave();
  };

  /**
   * Pause saving (used during collaboration)
   */
  pauseSave = (lockType: "collaboration") => {
    this.localAdapter.pauseSave(lockType);
  };

  /**
   * Resume saving
   */
  resumeSave = (lockType: "collaboration") => {
    this.localAdapter.resumeSave(lockType);
  };

  /**
   * Check if saving is paused
   */
  isSavePaused = () => {
    return this.localAdapter.isSavePaused();
  };

  // =========================================================================
  // Cloud Sync Methods
  // =========================================================================

  /**
   * Enable cloud sync for an authenticated user.
   */
  enableCloudSync(userId: string): void {
    this._userId = userId;
    this._cloudEnabled = true;

    // Initialize CloudStorageAdapter
    this.cloudAdapter = new CloudStorageAdapter(userId);

    // Initialize SyncEngine
    this.syncEngine = new SyncEngine(this.localAdapter, this.cloudAdapter);

    // Wire up sync status changes
    this.syncEngine.setOnStateChange((state) => {
      this._syncStatus = state.status;
      this._onSyncStatusChange?.(state.status);
    });

    // Start sync engine
    this.syncEngine.start().catch(console.error);

    console.log("[HybridStorageAdapter] Cloud sync enabled for user:", userId);
  }

  /**
   * Disable cloud sync (called on logout).
   */
  disableCloudSync(): void {
    // Stop sync engine
    this.syncEngine?.stop();
    this.syncEngine = null;

    // Clear cloud adapter
    this.cloudAdapter = null;
    this._cloudEnabled = false;
    this._userId = null;
    this._syncStatus = "idle";

    console.log("[HybridStorageAdapter] Cloud sync disabled");
  }

  /**
   * Check if cloud sync is currently enabled.
   */
  isCloudSyncEnabled(): boolean {
    return this._cloudEnabled;
  }

  /**
   * Get the current user ID (if authenticated).
   */
  getUserId(): string | null {
    return this._userId;
  }

  /**
   * Get the current sync status.
   */
  getSyncStatus(): SyncStatus {
    return this._syncStatus;
  }

  /**
   * Register callback for sync status changes.
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): void {
    this._onSyncStatusChange = callback;
  }

  // =========================================================================
  // StorageAdapter Implementation
  // =========================================================================

  /**
   * Get all boards. Always reads from local first for instant response.
   */
  async getBoards(): Promise<Board[]> {
    return this.localAdapter.getBoards();
  }

  /**
   * Create a new board. Creates locally first, then syncs to cloud.
   */
  async createBoard(name: string): Promise<string> {
    const boardId = await this.localAdapter.createBoard(name);

    // Sync to cloud directly
    if (this.cloudAdapter) {
      this.cloudAdapter.createBoardWithId(boardId, name).catch(console.error);
    }

    return boardId;
  }

  /**
   * Create a board with a specific ID (used for sync operations).
   */
  async createBoardWithId(id: string, name: string): Promise<void> {
    await this.localAdapter.createBoardWithId(id, name);

    // Sync to cloud
    if (this.cloudAdapter) {
      this.cloudAdapter.createBoardWithId(id, name).catch(console.error);
    }
  }

  /**
   * Update a board's metadata.
   */
  async updateBoard(id: string, data: Partial<Board>): Promise<void> {
    await this.localAdapter.updateBoard(id, data);

    // Sync metadata to cloud directly
    if (this.cloudAdapter) {
      this.cloudAdapter.updateBoard(id, data).catch(console.error);
    }
  }

  /**
   * Delete a board.
   */
  async deleteBoard(id: string): Promise<void> {
    await this.localAdapter.deleteBoard(id);

    // Sync deletion to cloud directly
    if (this.cloudAdapter) {
      this.cloudAdapter.deleteBoard(id).catch(console.error);
    }
  }

  /**
   * Get the current board ID.
   */
  async getCurrentBoardId(): Promise<string | null> {
    return this.localAdapter.getCurrentBoardId();
  }

  /**
   * Set the current board ID.
   */
  async setCurrentBoardId(id: string): Promise<void> {
    await this.localAdapter.setCurrentBoardId(id);
  }

  /**
   * Switch to a different board (BoardsAPI method).
   */
  async switchBoard(id: string): Promise<void> {
    await this.setCurrentBoardId(id);
  }

  /**
   * Update a board's name (BoardsAPI method).
   */
  async updateBoardName(id: string, name: string): Promise<void> {
    await this.updateBoard(id, { name });
  }

  /**
   * Get board content. Reads local first for instant display.
   */
  async getBoardContent(boardId: string): Promise<BoardContent> {
    return this.localAdapter.getBoardContent(boardId);
  }

  /**
   * Save board content to local (and optionally cloud).
   */
  async saveBoardContent(boardId: string, content: BoardContent): Promise<void> {
    await this.localAdapter.saveBoardContent(boardId, content);

    // Sync to cloud
    if (this.cloudAdapter) {
      this.cloudAdapter.saveBoardContent(boardId, content).catch(console.error);
    }
  }

  /**
   * Get available workspaces (cloud only).
   */
  async getWorkspaces(): Promise<Workspace[]> {
    if (!this.cloudAdapter) {
      return [
        {
          id: "local",
          name: "Local Workspace",
          ownerUserId: "local",
          createdAt: 0,
          updatedAt: Date.now(),
        },
      ];
    }

    return this.cloudAdapter.getWorkspaces();
  }

  /**
   * Convenience method for synchronous board data loading.
   * Used by App.tsx for board switching.
   */
  loadBoardData(boardId: string): { elements: any[]; appState: any } {
    return this.localAdapter.loadBoardData(boardId);
  }
}

// Export a singleton instance
export const hybridStorageAdapter = new HybridStorageAdapter();

// Re-export localStorageQuotaExceededAtom for backwards compatibility
export { localStorageQuotaExceededAtom } from "./LocalStorageAdapter";
