/**
 * SyncEngine - Simplified
 *
 * Only handles initial sync when user logs in.
 * No periodic sync - HybridStorageAdapter calls CloudStorageAdapter directly.
 */

import { debounce } from "@/lib/common";

import type { ConvexStorageAdapter } from "./ConvexStorageAdapter";
import type { LocalStorageAdapter } from "./LocalStorageAdapter";

export type SyncStatus = "idle" | "syncing" | "error";

export type SyncState = {
  status: SyncStatus;
  lastSyncAt: number | null;
  error: string | null;
};

/**
 * SyncEngine - handles initial sync on login
 *
 * Flow:
 * 1. User logs in → start() called
 * 2. Pull cloud boards to local (one-time)
 * 3. Done - no periodic sync, HybridStorageAdapter handles real-time sync
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

  /**
   * Get current sync state
   */
  get state(): SyncState {
    return this._state;
  }

  /**
   * Register callback for state changes
   */
  setOnStateChange(callback: (state: SyncState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Update internal state and notify listeners
   */
  private updateState(updates: Partial<SyncState>): void {
    this._state = { ...this._state, ...updates };
    this.onStateChange?.(this._state);
  }

  /**
   * Start sync engine - does initial pull from cloud
   */
  async start(): Promise<void> {
    this.isStopped = false;
    console.log("[SyncEngine] Starting...");

    // Ensure we have a workspace
    // ConvexStorageAdapter now handles auth timing internally
    try {
      await this.cloudAdapter.ensureDefaultWorkspace();
      console.log("[SyncEngine] Default workspace ensured");

      // Do initial pull from cloud
      await this.initialPullFromCloud();
    } catch (error) {
      console.error("[SyncEngine] Failed to ensure workspace:", error);
      console.warn("[SyncEngine] Continuing without workspace - cloud sync will be limited");
    }

    console.log("[SyncEngine] Started (no periodic sync)");
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
   * Initial pull from cloud - downloads cloud boards to local
   * Only runs on login, NOT bidirectional
   */
  private async initialPullFromCloud(): Promise<void> {
    if (this.isStopped) return;

    console.log("[SyncEngine] Pulling from cloud...");
    this.updateState({ status: "syncing", error: null });

    try {
      const [localBoards, cloudBoards] = await Promise.all([
        this.localAdapter.getBoards(),
        this.cloudAdapter.getBoards(),
      ]);

      const localMap = new Map(localBoards.map((b) => [b.id, b]));
      const cloudMap = new Map(cloudBoards.map((b) => [b.id, b]));

      // Download cloud boards that don't exist locally
      for (const [id, board] of cloudMap) {
        if (!localMap.has(id)) {
          console.log(`[SyncEngine] Downloading cloud board: ${id}`);
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

      // Upload local boards that don't exist in cloud
      for (const [id, board] of localMap) {
        if (!cloudMap.has(id)) {
          console.log(`[SyncEngine] Uploading local board: ${id}`);
          try {
            // Create board in cloud and get the cloud board ID
            const cloudBoardId = await this.cloudAdapter.createBoardWithId(id, board.name);
            // Store the cloud ID mapping in the local board
            await this.localAdapter.updateBoard(id, { cloudId: cloudBoardId });
            // Use the cloud board ID for content operations
            const content = await this.localAdapter.getBoardContent(id);
            if (content.elements.length > 0) {
              await this.cloudAdapter.saveBoardContent(cloudBoardId, content);
            }
          } catch (error) {
            console.error(`[SyncEngine] Failed to upload board ${id}:`, error);
          }
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
   * Schedule debounced content sync for a board
   * Called by HybridStorageAdapter when board content changes
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
   * Sync content for a specific board to cloud
   */
  async syncBoardContent(boardId: string): Promise<void> {
    if (this.isStopped) return;

    try {
      // Get the local board to find the cloud ID mapping
      const boards = await this.localAdapter.getBoards();
      const board = boards.find((b) => b.id === boardId);

      if (!board) {
        console.error(`[SyncEngine] Board not found: ${boardId}`);
        return;
      }

      // Use cloud ID if available, otherwise skip (board hasn't been synced yet)
      const cloudBoardId = board.cloudId;
      if (!cloudBoardId) {
        console.log(`[SyncEngine] Board ${boardId} not yet synced to cloud, skipping content sync`);
        return;
      }

      const localContent = await this.localAdapter.getBoardContent(boardId);
      await this.cloudAdapter.saveBoardContent(cloudBoardId, localContent);
      console.log(`[SyncEngine] Synced content for board: ${boardId} (cloud ID: ${cloudBoardId})`);
    } catch (error) {
      console.error(`[SyncEngine] Failed to sync board content ${boardId}:`, error);
    }
  }
}
