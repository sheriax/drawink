/**
 * SyncEngine
 *
 * Handles background synchronization between local and cloud storage.
 * Follows an eventual consistency model with last-write-wins conflict resolution.
 *
 * Features:
 * - Full sync on login and tab focus
 * - Periodic sync every 30 seconds
 * - Debounced content saves (2 second delay)
 * - Visibility change detection
 * - beforeunload flush
 */

import { debounce } from "@drawink/common";

import type { Board } from "@drawink/drawink/types";
import type {
  SyncStatus,
  SyncState,
  BoardContent,
} from "@drawink/drawink/storage/types";

import type { LocalStorageAdapter } from "./LocalStorageAdapter";
import type { CloudStorageAdapter } from "./CloudStorageAdapter";

/**
 * Callback type for sync state changes
 */
export type SyncStateCallback = (state: SyncState) => void;

/**
 * SyncEngine
 * Manages the synchronization between local and cloud storage.
 */
export class SyncEngine {
  private localAdapter: LocalStorageAdapter;
  private cloudAdapter: CloudStorageAdapter;

  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private pendingSyncs: Map<string, ReturnType<typeof debounce>> = new Map();
  private onStateChange: SyncStateCallback | null = null;
  private isStopped = false;

  // Sync state
  private _state: SyncState = {
    status: "idle",
    lastSyncAt: null,
    pendingChanges: 0,
    error: null,
  };

  constructor(
    localAdapter: LocalStorageAdapter,
    cloudAdapter: CloudStorageAdapter,
  ) {
    this.localAdapter = localAdapter;
    this.cloudAdapter = cloudAdapter;
  }

  /**
   * Get current sync state
   */
  get state(): SyncState {
    return { ...this._state };
  }

  /**
   * Set callback for sync state changes
   */
  setOnStateChange(callback: SyncStateCallback): void {
    this.onStateChange = callback;
  }

  /**
   * Update sync state and notify listeners
   */
  private updateState(updates: Partial<SyncState>): void {
    this._state = { ...this._state, ...updates };
    this.onStateChange?.(this._state);
  }

  /**
   * Start automatic background sync
   */
  async start(): Promise<void> {
    this.isStopped = false;
    console.log("[SyncEngine] Starting...");

    // Ensure we have a workspace
    try {
      await this.cloudAdapter.ensureDefaultWorkspace();
    } catch (error) {
      console.error("[SyncEngine] Failed to ensure workspace:", error);
    }

    // Initial full sync
    await this.fullSync();

    // Periodic sync every 30 seconds
    this.syncInterval = setInterval(() => {
      if (!this.isStopped) {
        this.fullSync().catch(console.error);
      }
    }, 30000);

    // Sync on visibility change (tab becomes active)
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    // Sync before unload
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    window.addEventListener("beforeunload", this.handleBeforeUnload);

    console.log("[SyncEngine] Started");
  }

  /**
   * Stop sync engine
   */
  stop(): void {
    this.isStopped = true;
    console.log("[SyncEngine] Stopping...");

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Remove event listeners
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    window.removeEventListener("beforeunload", this.handleBeforeUnload);

    // Flush any pending syncs
    this.flushPendingSyncs();

    this.updateState({ status: "idle", pendingChanges: 0 });
    console.log("[SyncEngine] Stopped");
  }

  /**
   * Handle visibility change
   */
  private handleVisibilityChange(): void {
    if (!document.hidden && !this.isStopped) {
      this.fullSync().catch(console.error);
    }
  }

  /**
   * Handle beforeunload - flush pending syncs
   */
  private handleBeforeUnload(): void {
    this.flushPendingSyncs();
  }

  /**
   * Full sync: sync boards list + current board content
   */
  async fullSync(): Promise<void> {
    if (this.isStopped) return;

    console.log("[SyncEngine] Starting full sync...");
    this.updateState({ status: "syncing", error: null });

    try {
      await this.syncBoards();

      // Sync current board content
      const currentBoardId = await this.localAdapter.getCurrentBoardId();
      if (currentBoardId) {
        await this.syncBoardContent(currentBoardId);
      }

      this.updateState({
        status: "idle",
        lastSyncAt: Date.now(),
        error: null,
      });
      console.log("[SyncEngine] Full sync completed");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Sync failed";
      console.error("[SyncEngine] Full sync failed:", error);
      this.updateState({
        status: "error",
        error: errorMessage,
      });
    }
  }

  /**
   * Sync boards list between local and cloud
   */
  async syncBoards(): Promise<void> {
    if (this.isStopped) return;

    const [localBoards, cloudBoards] = await Promise.all([
      this.localAdapter.getBoards(),
      this.cloudAdapter.getBoards(),
    ]);

    // Create maps for easy lookup
    const localMap = new Map(localBoards.map((b) => [b.id, b]));
    const cloudMap = new Map(cloudBoards.map((b) => [b.id, b]));

    // Boards only in local → upload to cloud
    for (const [id, board] of localMap) {
      if (!cloudMap.has(id)) {
        console.log(`[SyncEngine] Uploading local board to cloud: ${id}`);
        try {
          await this.cloudAdapter.createBoardWithId(id, board.name);
          const content = await this.localAdapter.getBoardContent(id);
          if (content.elements.length > 0) {
            await this.cloudAdapter.saveBoardContent(id, content);
          }
        } catch (error) {
          console.error(`[SyncEngine] Failed to upload board ${id}:`, error);
        }
      }
    }

    // Boards only in cloud → download to local
    for (const [id, board] of cloudMap) {
      if (!localMap.has(id)) {
        console.log(`[SyncEngine] Downloading cloud board to local: ${id}`);
        try {
          await this.localAdapter.createBoardWithId(id, board.name);
          const content = await this.cloudAdapter.getBoardContent(id);
          if (content.elements.length > 0) {
            await this.localAdapter.saveBoardContent(id, content);
          }
        } catch (error) {
          console.error(`[SyncEngine] Failed to download board ${id}:`, error);
        }
      }
    }

    // Boards in both → sync based on lastModified
    for (const [id, localBoard] of localMap) {
      const cloudBoard = cloudMap.get(id);
      if (cloudBoard) {
        const localTime = localBoard.lastModified || 0;
        const cloudTime = cloudBoard.lastModified || 0;

        if (localTime > cloudTime) {
          // Local is newer → push to cloud
          console.log(`[SyncEngine] Pushing updates to cloud for board: ${id}`);
          try {
            const content = await this.localAdapter.getBoardContent(id);
            await this.cloudAdapter.saveBoardContent(id, content);
          } catch (error) {
            console.error(`[SyncEngine] Failed to push board ${id}:`, error);
          }
        } else if (cloudTime > localTime) {
          // Cloud is newer → pull to local
          console.log(`[SyncEngine] Pulling updates from cloud for board: ${id}`);
          try {
            const content = await this.cloudAdapter.getBoardContent(id);
            await this.localAdapter.saveBoardContent(id, content);

            // Dispatch event for UI to update
            this.dispatchSyncUpdate(id, content);
          } catch (error) {
            console.error(`[SyncEngine] Failed to pull board ${id}:`, error);
          }
        }
      }
    }
  }

  /**
   * Sync specific board content
   */
  async syncBoardContent(boardId: string): Promise<void> {
    if (this.isStopped) return;

    try {
      const [localContent, cloudContent] = await Promise.all([
        this.localAdapter.getBoardContent(boardId),
        this.cloudAdapter.getBoardContent(boardId),
      ]);

      const localVersion = localContent.version || 0;
      const cloudVersion = cloudContent.version || 0;

      if (localVersion > cloudVersion) {
        // Local is newer → push
        console.log(`[SyncEngine] Pushing content for board: ${boardId}`);
        await this.cloudAdapter.saveBoardContent(boardId, localContent);
      } else if (cloudVersion > localVersion) {
        // Cloud is newer → pull
        console.log(`[SyncEngine] Pulling content for board: ${boardId}`);
        await this.localAdapter.saveBoardContent(boardId, cloudContent);

        // Dispatch event for UI to update
        this.dispatchSyncUpdate(boardId, cloudContent);
      }
      // If versions are equal, no sync needed
    } catch (error) {
      console.error(
        `[SyncEngine] Failed to sync board content ${boardId}:`,
        error,
      );
    }
  }

  /**
   * Upload a newly created board to cloud
   */
  async syncNewBoard(boardId: string): Promise<void> {
    if (this.isStopped) return;

    try {
      const boards = await this.localAdapter.getBoards();
      const board = boards.find((b) => b.id === boardId);
      if (!board) return;

      await this.cloudAdapter.createBoardWithId(boardId, board.name);
      console.log(`[SyncEngine] New board synced to cloud: ${boardId}`);
    } catch (error) {
      console.error(`[SyncEngine] Failed to sync new board ${boardId}:`, error);
    }
  }

  /**
   * Sync board deletion to cloud
   */
  async syncBoardDeletion(boardId: string): Promise<void> {
    if (this.isStopped) return;

    try {
      await this.cloudAdapter.deleteBoard(boardId);
      console.log(`[SyncEngine] Board deletion synced to cloud: ${boardId}`);
    } catch (error) {
      console.error(
        `[SyncEngine] Failed to sync board deletion ${boardId}:`,
        error,
      );
    }
  }

  /**
   * Schedule debounced sync for board content
   * This is called frequently during editing, so we debounce
   */
  scheduleBoardContentSync(boardId: string): void {
    if (this.isStopped) return;

    if (!this.pendingSyncs.has(boardId)) {
      const debouncedSync = debounce(async () => {
        await this.syncBoardContent(boardId);
        this.pendingSyncs.delete(boardId);
        this.updateState({
          pendingChanges: Math.max(0, this._state.pendingChanges - 1),
        });
      }, 2000);

      this.pendingSyncs.set(boardId, debouncedSync);
    }

    this.pendingSyncs.get(boardId)!();
    this.updateState({ pendingChanges: this._state.pendingChanges + 1 });
  }

  /**
   * Flush all pending syncs immediately
   */
  flushPendingSyncs(): void {
    for (const [, syncFn] of this.pendingSyncs) {
      syncFn.flush?.();
    }
    this.pendingSyncs.clear();
    this.updateState({ pendingChanges: 0 });
  }

  /**
   * Dispatch a custom event when cloud data is pulled
   * so the UI can update if needed
   */
  private dispatchSyncUpdate(boardId: string, content: BoardContent): void {
    window.dispatchEvent(
      new CustomEvent("drawink-sync-update", {
        detail: { boardId, content },
      }),
    );
  }
}
