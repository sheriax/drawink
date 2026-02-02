/**
 * SyncEngine (Cloud-First Architecture v3)
 *
 * Simplified to:
 * 1. Initial pull from cloud on login (one-time)
 * 2. Content sync for edits (push local changes to cloud)
 *
 * REMOVED: Upload local boards to cloud (was causing phantom boards)
 * Cloud is now source of truth — we only pull from cloud, never upload orphaned boards.
 */

import { debounce } from "@/lib/common";

import type { ConvexStorageAdapter } from "./ConvexStorageAdapter";
import type { LocalStorageAdapter } from "./LocalStorageAdapter";

export type SyncStatus = "idle" | "syncing" | "error";

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;
  error: string | null;
}

/**
 * SyncEngine - handles cloud→local sync on login
 *
 * Flow:
 * 1. User logs in → start() called
 * 2. Pull cloud boards to local cache (one-time)
 * 3. Done - HybridStorageAdapter handles real-time sync via OfflineQueue
 */
export class SyncEngine {
  private localAdapter: LocalStorageAdapter;
  private cloudAdapter: ConvexStorageAdapter;

  private _state: SyncState = {
    status: "idle",
    lastSyncAt: null,
    error: null,
  };

  private onStateChange: ((state: SyncState) => void) | null = null;
  private isStopped = false;

  // Debounced content sync for batching rapid changes
  private pendingContentSyncs = new Map<string, ReturnType<typeof debounce>>();

  constructor(localAdapter: LocalStorageAdapter, cloudAdapter: ConvexStorageAdapter) {
    this.localAdapter = localAdapter;
    this.cloudAdapter = cloudAdapter;
  }

  get state(): SyncState {
    return this._state;
  }

  setOnStateChange(callback: (state: SyncState) => void): void {
    this.onStateChange = callback;
  }

  private updateState(updates: Partial<SyncState>): void {
    this._state = { ...this._state, ...updates };
    this.onStateChange?.(this._state);
  }

  /**
   * Start sync engine - does initial pull from cloud
   */
  async start(): Promise<void> {
    this.isStopped = false;
    console.log("[SyncEngine] Starting (cloud-first mode)...");

    try {
      // Ensure we have a workspace
      await this.cloudAdapter.ensureDefaultWorkspace();
      console.log("[SyncEngine] Default workspace ensured");

      // Pull cloud boards to local cache
      await this.initialPullFromCloud();
    } catch (error) {
      console.error("[SyncEngine] Failed to start:", error);
      this.updateState({ status: "error", error: String(error) });
    }

    console.log("[SyncEngine] Started");
  }

  /**
   * Stop sync engine
   */
  stop(): void {
    this.isStopped = true;

    // Cancel pending syncs
    for (const debouncedFn of this.pendingContentSyncs.values()) {
      debouncedFn.cancel();
    }
    this.pendingContentSyncs.clear();

    console.log("[SyncEngine] Stopped");
  }

  /**
   * Initial pull from cloud - downloads cloud boards to local cache
   * CLOUD-FIRST: No local→cloud upload (removed to prevent phantom boards)
   */
  private async initialPullFromCloud(): Promise<void> {
    if (this.isStopped) return;

    console.log("[SyncEngine] Pulling boards from cloud...");
    this.updateState({ status: "syncing", error: null });

    try {
      const cloudBoards = await this.cloudAdapter.getBoards();
      console.log(`[SyncEngine] Found ${cloudBoards.length} cloud boards`);

      // Replace local cache with cloud boards (cloud is truth)
      await this.localAdapter.updateBoardCache(cloudBoards);

      // Download board content for each cloud board
      for (const board of cloudBoards) {
        try {
          const content = await this.cloudAdapter.getBoardContent(board.id);
          if (content.elements.length > 0) {
            await this.localAdapter.saveBoardContent(board.id, content);
          }
        } catch (error) {
          console.error(`[SyncEngine] Failed to download content for ${board.id}:`, error);
        }
      }

      this.updateState({
        status: "idle",
        lastSyncAt: Date.now(),
        error: null,
      });

      console.log("[SyncEngine] Initial pull completed");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Initial sync failed";
      console.error("[SyncEngine] Initial pull failed:", error);
      this.updateState({
        status: "error",
        error: errorMessage,
      });
    }
  }

  /**
   * Schedule debounced content sync for a board.
   * Called by HybridStorageAdapter when board content changes.
   */
  scheduleBoardContentSync(boardId: string): void {
    if (this.isStopped) return;

    // Get or create debounced function for this board
    let debouncedSync = this.pendingContentSyncs.get(boardId);
    if (!debouncedSync) {
      debouncedSync = debounce(async () => {
        await this.syncBoardContent(boardId);
      }, 2000);
      this.pendingContentSyncs.set(boardId, debouncedSync);
    }

    debouncedSync();
  }

  /**
   * Sync content for a specific board to cloud.
   */
  async syncBoardContent(boardId: string): Promise<void> {
    if (this.isStopped || !navigator.onLine) return;

    try {
      // Skip temp/local boards (they should be queued via OfflineQueue)
      if (boardId.startsWith("local_")) {
        console.log(`[SyncEngine] Skipping temp board: ${boardId}`);
        return;
      }

      const localContent = await this.localAdapter.getBoardContent(boardId);
      await this.cloudAdapter.saveBoardContent(boardId, localContent);
      console.log(`[SyncEngine] Synced content for board: ${boardId}`);
    } catch (error) {
      console.error(`[SyncEngine] Failed to sync board content ${boardId}:`, error);
    }
  }
}
