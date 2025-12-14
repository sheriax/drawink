/**
 * HybridStorageAdapter
 *
 * The main storage interface for Drawink that orchestrates local and cloud storage.
 * Follows a local-first approach: always reads from local first for instant response,
 * then syncs with cloud in the background when authenticated.
 */

import type {
  StorageAdapter,
  BoardContent,
  Workspace,
  SyncStatus,
} from "@drawink/drawink/storage/types";
import type { Board } from "@drawink/drawink/types";

import { LocalStorageAdapter, localStorageAdapter } from "./LocalStorageAdapter";

// CloudStorageAdapter will be added in Phase 2
// import { CloudStorageAdapter } from "./CloudStorageAdapter";

// SyncEngine will be added in Phase 3
// import { SyncEngine } from "./SyncEngine";

/**
 * HybridStorageAdapter orchestrates between local and cloud storage.
 * - For anonymous users: only local storage is used
 * - For authenticated users: local-first with background cloud sync
 */
export class HybridStorageAdapter implements StorageAdapter {
  private localAdapter: LocalStorageAdapter;
  // private cloudAdapter: CloudStorageAdapter | null = null;
  // private syncEngine: SyncEngine | null = null;

  private _cloudEnabled = false;
  private _userId: string | null = null;
  private _syncStatus: SyncStatus = "idle";
  private _onSyncStatusChange: ((status: SyncStatus) => void) | null = null;

  constructor(localAdapter?: LocalStorageAdapter) {
    this.localAdapter = localAdapter || localStorageAdapter;
  }

  /**
   * Enable cloud sync for an authenticated user.
   * This will be fully implemented in Phase 2.
   */
  enableCloudSync(userId: string): void {
    this._userId = userId;
    this._cloudEnabled = true;

    // Phase 2: Initialize CloudStorageAdapter
    // this.cloudAdapter = new CloudStorageAdapter(userId);

    // Phase 3: Initialize SyncEngine
    // this.syncEngine = new SyncEngine(this.localAdapter, this.cloudAdapter);
    // this.syncEngine.start();

    console.log("[HybridStorageAdapter] Cloud sync enabled for user:", userId);
  }

  /**
   * Disable cloud sync (called on logout).
   */
  disableCloudSync(): void {
    // Phase 3: Stop sync engine
    // this.syncEngine?.stop();
    // this.syncEngine = null;

    // this.cloudAdapter = null;
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
   * Set a callback for sync status changes.
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): void {
    this._onSyncStatusChange = callback;
  }

  /**
   * Update sync status and notify listeners.
   */
  private setSyncStatus(status: SyncStatus): void {
    this._syncStatus = status;
    this._onSyncStatusChange?.(status);
  }

  // =========================================================================
  // StorageAdapter Implementation
  // =========================================================================

  /**
   * Get all boards. Always reads from local first for instant response.
   */
  async getBoards(): Promise<Board[]> {
    // Always read from local for instant response
    const localBoards = await this.localAdapter.getBoards();

    // Phase 3: If cloud sync is enabled, trigger background sync
    // if (this.syncEngine) {
    //   this.syncEngine.syncBoards().catch(console.error);
    // }

    return localBoards;
  }

  /**
   * Create a new board. Creates locally first, then syncs to cloud.
   */
  async createBoard(name: string): Promise<string> {
    // Create locally first for instant feedback
    const boardId = await this.localAdapter.createBoard(name);

    // Phase 3: Sync to cloud in background
    // if (this.syncEngine) {
    //   this.syncEngine.syncNewBoard(boardId).catch(console.error);
    // }

    return boardId;
  }

  /**
   * Create a board with a specific ID (used for sync operations).
   */
  async createBoardWithId(id: string, name: string): Promise<void> {
    await this.localAdapter.createBoardWithId(id, name);
  }

  /**
   * Update a board's metadata.
   */
  async updateBoard(id: string, data: Partial<Board>): Promise<void> {
    await this.localAdapter.updateBoard(id, data);

    // Phase 3: Sync update to cloud
    // if (this.syncEngine) {
    //   this.syncEngine.scheduleBoardSync(id).catch(console.error);
    // }
  }

  /**
   * Delete a board.
   */
  async deleteBoard(id: string): Promise<void> {
    await this.localAdapter.deleteBoard(id);

    // Phase 3: Sync deletion to cloud
    // if (this.syncEngine) {
    //   this.syncEngine.syncBoardDeletion(id).catch(console.error);
    // }
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
   * Get board content. Reads local first for instant display.
   */
  async getBoardContent(boardId: string): Promise<BoardContent> {
    // Load local first for instant display
    const localContent = await this.localAdapter.getBoardContent(boardId);

    // Phase 3: Sync with cloud in background
    // if (this.syncEngine) {
    //   this.syncEngine.syncBoardContent(boardId).catch(console.error);
    // }

    return localContent;
  }

  /**
   * Save board content. Saves locally first, then syncs to cloud.
   */
  async saveBoardContent(boardId: string, content: BoardContent): Promise<void> {
    // Save locally first (instant)
    await this.localAdapter.saveBoardContent(boardId, content);

    // Phase 3: Sync to cloud in background (debounced)
    // if (this.syncEngine) {
    //   this.syncEngine.scheduleBoardContentSync(boardId);
    // }
  }

  // =========================================================================
  // Workspace Operations (Cloud Only - Phase 2)
  // =========================================================================

  /**
   * Get workspaces. Returns a single "Local" workspace for anonymous users.
   */
  async getWorkspaces(): Promise<Workspace[]> {
    if (!this._cloudEnabled) {
      // Return a single "Local" workspace for non-authenticated users
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

    // Phase 2: Get workspaces from cloud
    // return this.cloudAdapter!.getWorkspaces();
    return [];
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
