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
import type { Board, BoardsAPI } from "@drawink/drawink/types";

import { LocalStorageAdapter, localStorageAdapter } from "./LocalStorageAdapter";
import { CloudStorageAdapter } from "./CloudStorageAdapter";
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
   * Set a callback for sync status changes.
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): void {
    this._onSyncStatusChange = callback;
  }

  /**
   * Trigger a full sync manually.
   */
  async triggerSync(): Promise<void> {
    if (this.syncEngine) {
      await this.syncEngine.fullSync();
    }
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

    // If cloud sync is enabled, trigger background sync
    if (this.syncEngine) {
      this.syncEngine.syncBoards().catch(console.error);
    }

    return localBoards;
  }

  /**
   * Create a new board. Creates locally first, then syncs to cloud.
   */
  async createBoard(name: string): Promise<string> {
    // Create locally first for instant feedback
    const boardId = await this.localAdapter.createBoard(name);

    // Sync to cloud in background
    if (this.syncEngine) {
      this.syncEngine.syncNewBoard(boardId).catch(console.error);
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

    // Sync deletion to cloud
    if (this.syncEngine) {
      this.syncEngine.syncBoardDeletion(id).catch(console.error);
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
    // Load local first for instant display
    const localContent = await this.localAdapter.getBoardContent(boardId);

    // Sync with cloud in background
    if (this.syncEngine) {
      this.syncEngine.syncBoardContent(boardId).catch(console.error);
    }

    return localContent;
  }

  /**
   * Save board content. Saves locally first, then syncs to cloud.
   */
  async saveBoardContent(boardId: string, content: BoardContent): Promise<void> {
    // Save locally first (instant)
    await this.localAdapter.saveBoardContent(boardId, content);

    // Sync to cloud in background (debounced)
    if (this.syncEngine) {
      this.syncEngine.scheduleBoardContentSync(boardId);
    }
  }

  // =========================================================================
  // Workspace Operations (Cloud Only)
  // =========================================================================

  /**
   * Get workspaces. Returns a single "Local" workspace for anonymous users.
   */
  async getWorkspaces(): Promise<Workspace[]> {
    if (!this._cloudEnabled || !this.cloudAdapter) {
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
