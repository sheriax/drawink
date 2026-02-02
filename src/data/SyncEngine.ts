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

      // Build a set of all cloud IDs that local boards already reference.
      // Local boards use their own IDs but store a `cloudId` that maps to
      // the Convex-generated ID.  We need this to avoid re-downloading
      // boards that were uploaded from this device.
      const knownCloudIds = new Set<string>();
      for (const lb of localBoards) {
        if (lb.cloudId) {
          knownCloudIds.add(lb.cloudId);
        }
        // Also add the local ID itself — in case a cloud board was
        // previously downloaded using the cloud ID as the local ID.
        knownCloudIds.add(lb.id);
      }

      const cloudMap = new Map(cloudBoards.map((b) => [b.id, b]));

      // Download cloud boards that don't exist locally
      for (const [cloudId, board] of cloudMap) {
        if (!knownCloudIds.has(cloudId)) {
          console.log(`[SyncEngine] Downloading cloud board: ${cloudId} (${board.name})`);
          try {
            // Store the cloud board locally using the cloud ID as the local ID
            await this.localAdapter.createBoardWithId(cloudId, board.name);
            // Also store the cloudId mapping so future syncs recognise it
            await this.localAdapter.updateBoard(cloudId, { cloudId });
            const content = await this.cloudAdapter.getBoardContent(cloudId);
            if (content.elements.length > 0) {
              await this.localAdapter.saveBoardContent(cloudId, content);
            }
          } catch (error) {
            console.error(`[SyncEngine] Failed to download board ${cloudId}:`, error);
          }
        }
      }

      // Upload local boards that don't exist in cloud
      // Skip boards that were explicitly deleted to prevent re-uploading
      const deletedIds = new Set(this.localAdapter.getDeletedBoardIds());
      
      for (const lb of localBoards) {
        // Skip boards that were explicitly deleted
        if (deletedIds.has(lb.id) || (lb.cloudId && deletedIds.has(lb.cloudId))) {
          console.log(`[SyncEngine] Skipping deleted board: ${lb.id} (${lb.name})`);
          continue;
        }
        // Skip boards that already have a cloud counterpart
        if (lb.cloudId && cloudMap.has(lb.cloudId)) {
          continue;
        }
        // Skip boards whose local ID is already a cloud ID (downloaded boards)
        if (cloudMap.has(lb.id)) {
          continue;
        }

        console.log(`[SyncEngine] Uploading local board: ${lb.id} (${lb.name})`);
        try {
          const cloudBoardId = await this.cloudAdapter.createBoardWithId(lb.id, lb.name);
          await this.localAdapter.updateBoard(lb.id, { cloudId: cloudBoardId });
          const content = await this.localAdapter.getBoardContent(lb.id);
          if (content.elements.length > 0) {
            await this.cloudAdapter.saveBoardContent(cloudBoardId, content);
          }
        } catch (error) {
          console.error(`[SyncEngine] Failed to upload board ${lb.id}:`, error);
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
   * Sync content for a specific board to cloud.
   * If the board doesn't exist locally or in Convex, it will be created.
   */
  async syncBoardContent(boardId: string): Promise<void> {
    if (this.isStopped) return;

    try {
      const boards = await this.localAdapter.getBoards();
      let board = boards.find((b) => b.id === boardId);

      // Board ID exists (e.g. in currentBoardId) but not in the local boards list.
      // This can happen after a fresh deployment or if the board was created
      // before the boards list feature existed. Register it locally.
      if (!board) {
        const content = await this.localAdapter.getBoardContent(boardId);
        if (content.elements.length === 0) {
          // No local content either — truly stale reference, skip
          console.warn(`[SyncEngine] No local data for board ${boardId}, skipping`);
          return;
        }
        console.log(`[SyncEngine] Registering orphaned board locally: ${boardId}`);
        await this.localAdapter.createBoardWithId(boardId, "Untitled Board");
        board = (await this.localAdapter.getBoards()).find((b) => b.id === boardId)!;
      }

      // If the board hasn't been synced to Convex yet, upload it now
      let cloudBoardId = board.cloudId;
      if (!cloudBoardId) {
        console.log(`[SyncEngine] Uploading board ${boardId} to cloud...`);
        try {
          cloudBoardId = await this.cloudAdapter.createBoardWithId(boardId, board.name);
          await this.localAdapter.updateBoard(boardId, { cloudId: cloudBoardId });
        } catch (error) {
          console.error(`[SyncEngine] Failed to create cloud board for ${boardId}:`, error);
          return;
        }
      }

      const localContent = await this.localAdapter.getBoardContent(boardId);
      await this.cloudAdapter.saveBoardContent(cloudBoardId, localContent);
      console.log(`[SyncEngine] Synced content for board: ${boardId} (cloud ID: ${cloudBoardId})`);
    } catch (error) {
      console.error(`[SyncEngine] Failed to sync board content ${boardId}:`, error);
    }
  }
}
