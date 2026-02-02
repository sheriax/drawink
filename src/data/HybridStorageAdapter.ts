/**
 * HybridStorageAdapter (Cloud-First Architecture v3)
 *
 * The main storage interface for Drawink that orchestrates local and cloud storage.
 *
 * ARCHITECTURE:
 * - Anonymous users: localStorage only (full offline support)
 * - Logged-in users: Cloud-first with local cache for offline support
 *
 * KEY PRINCIPLES:
 * 1. Cloud is source of truth for logged-in users
 * 2. Local storage is cache only (for logged-in users)
 * 3. Offline operations are queued and synced when online
 * 4. Anonymous data is isolated and preserved
 */

import type { BoardContent, StorageAdapter, Workspace } from "@/core/storage/types";
import type { AppState, BinaryFiles, Board, BoardsAPI } from "@/core/types";
import type { DrawinkElement } from "@/lib/elements/types";

import { ConvexStorageAdapter } from "./ConvexStorageAdapter";
import { type LocalStorageAdapter, localStorageAdapter } from "./LocalStorageAdapter";
import { offlineQueue, type QueuedOperation } from "./OfflineQueue";
import { SyncEngine } from "./SyncEngine";

// Storage keys
const ANONYMOUS_BOARDS_BACKUP = "drawink-anonymous-backup";

// Sync status type for UI
export interface CloudSyncStatus {
  isOnline: boolean;
  isCloudEnabled: boolean;
  pendingOperations: number;
  lastSyncTimestamp: number | null;
}

/**
 * HybridStorageAdapter orchestrates between local and cloud storage.
 * - Anonymous users: only local storage is used
 * - Logged-in users: cloud-first with local cache
 */
export class HybridStorageAdapter implements StorageAdapter, BoardsAPI {
  private localAdapter: LocalStorageAdapter;
  private cloudAdapter: ConvexStorageAdapter | null = null;
  private syncEngine: SyncEngine | null = null;

  private _userId: string | null = null;
  private _onSyncStatusChange: ((status: CloudSyncStatus) => void) | null = null;

  constructor(localAdapter?: LocalStorageAdapter) {
    this.localAdapter = localAdapter || localStorageAdapter;

    // Set up offline queue operation handler
    offlineQueue.setExecuteHandler(this.executeQueuedOperation.bind(this));
  }

  // =========================================================================
  // Passthrough to LocalStorageAdapter (file storage, save methods)
  // =========================================================================

  get fileStorage() {
    return this.localAdapter.fileStorage;
  }

  save = (
    elements: readonly DrawinkElement[],
    appState: AppState,
    files: BinaryFiles,
    onFilesSaved: () => void,
  ) => {
    // Save locally first
    this.localAdapter.save(elements, appState, files, () => {
      onFilesSaved();

      // For logged-in users, trigger cloud sync for current board content
      if (this.cloudAdapter && this.syncEngine) {
        this.localAdapter.getCurrentBoardId().then((boardId) => {
          if (boardId) {
            this.syncEngine!.scheduleBoardContentSync(boardId);
          }
        });
      }
    });
  };

  flushSave = () => this.localAdapter.flushSave();
  pauseSave = (lockType: "collaboration") => this.localAdapter.pauseSave(lockType);
  resumeSave = (lockType: "collaboration") => this.localAdapter.resumeSave(lockType);
  isSavePaused = () => this.localAdapter.isSavePaused();

  // =========================================================================
  // Auth State Management
  // =========================================================================

  /**
   * Enable cloud sync for an authenticated user.
   * CLOUD-FIRST: Clears anonymous data, loads from cloud.
   */
  enableCloudSync(userId: string, fetchToken?: () => Promise<string | null>): void {
    this._userId = userId;

    // Check if Convex URL is configured
    const convexUrl = import.meta.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      console.warn("[HybridStorageAdapter] Cloud sync disabled - VITE_CONVEX_URL not set");
      return;
    }

    // STEP 1: Backup anonymous boards for potential future migration
    this.backupAnonymousBoards();

    // STEP 2: Clear anonymous data to prevent phantom boards
    this.localAdapter.clearCache();
    this.localAdapter.clearDeletedBoardIds();
    localStorage.removeItem("drawink-deleted-boards"); // Legacy cleanup

    // STEP 3: Initialize cloud adapter
    this.cloudAdapter = new ConvexStorageAdapter(userId, convexUrl, fetchToken);

    // STEP 4: Initialize SyncEngine (simplified: pull only, no upload)
    this.syncEngine = new SyncEngine(this.localAdapter, this.cloudAdapter);
    this.syncEngine.setOnStateChange(() => this.notifySyncStatusChange());

    // STEP 5: Start sync engine
    this.syncEngine.start().catch((error) => {
      console.error("[HybridStorageAdapter] Sync engine failed to start:", error);
    });

    // STEP 6: Process any pending offline operations
    offlineQueue.processQueue();

    console.log("[HybridStorageAdapter] Cloud sync enabled for user:", userId);
  }

  /**
   * Disable cloud sync (called on logout).
   * Clears cached cloud data for security.
   */
  disableCloudSync(): void {
    this.syncEngine?.stop();
    this.syncEngine = null;
    this.cloudAdapter = null;
    this._userId = null;

    // Clear cached cloud data (security: don't expose data after logout)
    this.localAdapter.clearCache();
    offlineQueue.clear();

    console.log("[HybridStorageAdapter] Cloud sync disabled, cache cleared");
  }

  /**
   * Backup anonymous boards before login (for potential future migration)
   */
  private backupAnonymousBoards(): void {
    try {
      const anonymousBoards = localStorage.getItem("drawink-boards");
      if (anonymousBoards) {
        const boards: Board[] = JSON.parse(anonymousBoards);
        // Only backup if they look like anonymous boards (no cloudId)
        if (boards.length > 0 && !boards[0].cloudId) {
          localStorage.setItem(ANONYMOUS_BOARDS_BACKUP, anonymousBoards);
          console.log(`[HybridStorageAdapter] Backed up ${boards.length} anonymous boards`);
        }
      }
    } catch (error) {
      console.error("[HybridStorageAdapter] Failed to backup anonymous boards:", error);
    }
  }

  isCloudSyncEnabled(): boolean {
    return this.cloudAdapter !== null;
  }

  getUserId(): string | null {
    return this._userId;
  }

  // =========================================================================
  // Sync Status
  // =========================================================================

  getSyncStatus(): CloudSyncStatus {
    return {
      isOnline: navigator.onLine,
      isCloudEnabled: this.isCloudSyncEnabled(),
      pendingOperations: offlineQueue.getPendingCount(),
      lastSyncTimestamp: this.localAdapter.getLastSyncTimestamp(),
    };
  }

  onSyncStatusChange(callback: (status: CloudSyncStatus) => void): void {
    this._onSyncStatusChange = callback;
  }

  private notifySyncStatusChange(): void {
    this._onSyncStatusChange?.(this.getSyncStatus());
  }

  // =========================================================================
  // Board Operations (CLOUD-FIRST)
  // =========================================================================

  /**
   * Get all boards.
   * - Anonymous: local only
   * - Logged-in: cloud-first with cache fallback
   */
  async getBoards(): Promise<Board[]> {
    // Anonymous: local only
    if (!this.cloudAdapter) {
      return this.localAdapter.getBoards();
    }

    // Logged-in + Online: cloud-first
    if (navigator.onLine) {
      try {
        const cloudBoards = await this.cloudAdapter.getBoards();
        // Update local cache (cloud is truth)
        await this.localAdapter.updateBoardCache(cloudBoards);
        return cloudBoards;
      } catch (error) {
        console.warn("[HybridStorageAdapter] Cloud fetch failed, using cache:", error);
        return this.localAdapter.getBoards();
      }
    }

    // Logged-in + Offline: use cache
    return this.localAdapter.getBoards();
  }

  /**
   * Create a new board.
   * - Anonymous: local only
   * - Logged-in + Online: cloud-first
   * - Logged-in + Offline: queue operation
   */
  async createBoard(name: string): Promise<string> {
    // Anonymous: local only
    if (!this.cloudAdapter) {
      return this.localAdapter.createBoard(name);
    }

    const idempotencyKey = crypto.randomUUID();

    // Logged-in + Online: cloud-first
    if (navigator.onLine) {
      try {
        const cloudId = await this.cloudAdapter.createBoardWithId(idempotencyKey, name);

        // Cache locally (non-fatal if fails)
        try {
          await this.localAdapter.createBoardWithId(cloudId, name);
        } catch (cacheError) {
          console.warn("[HybridStorageAdapter] Cache update failed:", cacheError);
        }

        return cloudId;
      } catch (error) {
        console.error("[HybridStorageAdapter] Cloud create failed:", error);
        throw error;
      }
    }

    // Logged-in + Offline: queue operation
    const tempId = `local_${idempotencyKey}`;

    // Optimistic local update
    await this.localAdapter.createBoardWithId(tempId, name);

    // Queue for sync
    offlineQueue.enqueue({
      type: "create",
      entityType: "board",
      entityId: tempId,
      payload: { name },
      idempotencyKey,
    });

    this.notifySyncStatusChange();
    return tempId;
  }

  /**
   * Create a board with a specific ID (used for sync operations).
   */
  async createBoardWithId(id: string, name: string): Promise<string> {
    await this.localAdapter.createBoardWithId(id, name);

    if (this.cloudAdapter && navigator.onLine) {
      try {
        const cloudBoardId = await this.cloudAdapter.createBoardWithId(id, name);
        return cloudBoardId || id;
      } catch (error) {
        console.error("[HybridStorageAdapter] Failed to create board in cloud:", error);
      }
    }

    return id;
  }

  /**
   * Update a board's metadata.
   * - Always updates local immediately (optimistic)
   * - Syncs to cloud or queues if offline
   */
  async updateBoard(id: string, data: Partial<Board>): Promise<void> {
    // Always update local cache immediately (optimistic)
    await this.localAdapter.updateBoard(id, data);

    // Anonymous: done
    if (!this.cloudAdapter) return;

    // Logged-in + Online: sync to cloud
    if (navigator.onLine) {
      try {
        await this.cloudAdapter.updateBoard(id, data);
      } catch (error) {
        console.warn("[HybridStorageAdapter] Cloud update failed, queuing:", error);
        this.queueUpdate(id, data);
      }
    } else {
      // Logged-in + Offline: queue
      this.queueUpdate(id, data);
    }
  }

  private queueUpdate(id: string, updates: Partial<Board>): void {
    // Check for existing queued update and merge
    const existing = offlineQueue.getPendingForEntity("board", id);
    if (existing && existing.type === "update") {
      offlineQueue.updatePending("board", id, {
        payload: { ...existing.payload, ...updates },
        timestamp: Date.now(),
      });
    } else {
      offlineQueue.enqueue({
        type: "update",
        entityType: "board",
        entityId: id,
        payload: updates,
      });
    }
    this.notifySyncStatusChange();
  }

  /**
   * Delete a board.
   * - Anonymous: local only
   * - Logged-in + Online: cloud-first
   * - Logged-in + Offline: queue operation
   */
  async deleteBoard(id: string): Promise<void> {
    // Anonymous: local only
    if (!this.cloudAdapter) {
      await this.localAdapter.deleteBoard(id);
      return;
    }

    // Logged-in + Online: cloud-first
    if (navigator.onLine) {
      try {
        await this.cloudAdapter.deleteBoard(id);
        await this.localAdapter.deleteBoard(id);
      } catch (error) {
        console.error("[HybridStorageAdapter] Cloud delete failed:", error);
        throw error;
      }
    } else {
      // Logged-in + Offline: queue deletion
      await this.localAdapter.markBoardPendingDelete(id);

      offlineQueue.enqueue({
        type: "delete",
        entityType: "board",
        entityId: id,
        payload: {},
      });

      this.notifySyncStatusChange();
    }
  }

  // =========================================================================
  // Offline Queue Handler
  // =========================================================================

  private async executeQueuedOperation(op: QueuedOperation): Promise<void> {
    if (!this.cloudAdapter) {
      throw new Error("Cloud adapter not available");
    }

    switch (op.type) {
      case "create":
        if (op.entityType === "board") {
          const cloudId = await this.cloudAdapter.createBoardWithId(
            op.idempotencyKey || op.entityId,
            op.payload.name,
          );
          // Update local cache: replace temp ID with cloud ID
          const boards = await this.localAdapter.getBoards();
          const board = boards.find((b) => b.id === op.entityId);
          if (board) {
            board.id = cloudId;
            board.cloudId = cloudId;
            await this.localAdapter.updateBoardCache(boards);
          }
        }
        break;

      case "update":
        if (op.entityType === "board") {
          await this.cloudAdapter.updateBoard(op.entityId, op.payload);
        }
        break;

      case "delete":
        if (op.entityType === "board") {
          await this.cloudAdapter.deleteBoard(op.entityId);
          await this.localAdapter.deleteBoard(op.entityId);
        }
        break;
    }
  }

  // =========================================================================
  // Other StorageAdapter Methods
  // =========================================================================

  async getCurrentBoardId(): Promise<string | null> {
    return this.localAdapter.getCurrentBoardId();
  }

  async setCurrentBoardId(id: string): Promise<void> {
    await this.localAdapter.setCurrentBoardId(id);
  }

  async switchBoard(id: string): Promise<void> {
    await this.setCurrentBoardId(id);
  }

  async updateBoardName(id: string, name: string): Promise<void> {
    await this.updateBoard(id, { name });
  }

  async getBoardContent(boardId: string): Promise<BoardContent> {
    return this.localAdapter.getBoardContent(boardId);
  }

  async saveBoardContent(boardId: string, content: BoardContent): Promise<void> {
    await this.localAdapter.saveBoardContent(boardId, content);

    if (this.cloudAdapter && navigator.onLine) {
      this.cloudAdapter.saveBoardContent(boardId, content).catch(console.error);
    }
  }

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

  loadBoardData(boardId: string): { elements: any[]; appState: any } {
    return this.localAdapter.loadBoardData(boardId);
  }

  /**
   * Manually trigger workspace sync (for recovery scenarios)
   */
  async ensureWorkspaceAndSync(): Promise<boolean> {
    if (!this.cloudAdapter || !this.syncEngine) {
      return false;
    }

    try {
      await this.cloudAdapter.ensureDefaultWorkspace();
      this.syncEngine.stop();
      await this.syncEngine.start();
      return true;
    } catch (error) {
      console.error("[HybridStorageAdapter] Failed to ensure workspace:", error);
      return false;
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const hybridStorageAdapter = new HybridStorageAdapter();

// Re-export for backwards compatibility
export { localStorageQuotaExceededAtom } from "./LocalStorageAdapter";

// Legacy type alias
export type SyncStatus = "idle" | "syncing" | "error";
