/**
 * OfflineQueue
 *
 * Captures all mutations when offline and replays them when connectivity returns.
 * Implements retry logic with exponential backoff.
 */

const QUEUE_KEY = "drawink-offline-queue";
const MAX_RETRIES = 3;

export interface QueuedOperation {
  id: string;
  type: "create" | "update" | "delete";
  entityType: "board" | "stroke" | "element";
  entityId: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  idempotencyKey?: string;
}

type SyncCallback = (op: QueuedOperation, success: boolean) => void;
type ExecuteHandler = (op: QueuedOperation) => Promise<void>;

export class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private onSyncCallbacks = new Set<SyncCallback>();
  private executeHandler: ExecuteHandler | null = null;

  constructor() {
    this.loadFromStorage();
    
    // Process queue when coming online
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.processQueue());
    }
  }

  /**
   * Set the handler that executes operations against the cloud
   */
  setExecuteHandler(handler: ExecuteHandler): void {
    this.executeHandler = handler;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      this.queue = stored ? JSON.parse(stored) : [];
    } catch {
      this.queue = [];
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
  }

  /**
   * Add an operation to the queue
   */
  enqueue(
    operation: Omit<QueuedOperation, "id" | "timestamp" | "retryCount">,
  ): string {
    const op: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    };
    this.queue.push(op);
    this.saveToStorage();
    this.notifyCallbacks(op, false); // Notify of new pending op
    return op.id;
  }

  /**
   * Process all queued operations
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine || !this.executeHandler) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const op = this.queue[0];

      try {
        await this.executeHandler(op);
        this.queue.shift(); // Remove on success
        this.saveToStorage();
        this.notifyCallbacks(op, true);
      } catch (error) {
        op.retryCount++;

        if (op.retryCount >= MAX_RETRIES) {
          console.error("[OfflineQueue] Operation failed permanently:", op, error);
          this.queue.shift();
          this.saveToStorage();
          this.notifyCallbacks(op, false);
        } else {
          // Exponential backoff: 2s, 4s, 8s
          await this.delay(Math.pow(2, op.retryCount) * 1000);
          this.saveToStorage();
        }
      }
    }

    this.isProcessing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Subscribe to sync events
   */
  onSync(callback: SyncCallback): () => void {
    this.onSyncCallbacks.add(callback);
    return () => this.onSyncCallbacks.delete(callback);
  }

  private notifyCallbacks(op: QueuedOperation, success: boolean): void {
    this.onSyncCallbacks.forEach((cb) => cb(op, success));
  }

  /**
   * Get count of pending operations
   */
  getPendingCount(): number {
    return this.queue.length;
  }

  /**
   * Get pending operation for a specific entity
   */
  getPendingForEntity(
    entityType: string,
    entityId: string,
  ): QueuedOperation | undefined {
    return this.queue.find(
      (op) => op.entityType === entityType && op.entityId === entityId,
    );
  }

  /**
   * Update an existing queued operation (for merging updates)
   */
  updatePending(
    entityType: string,
    entityId: string,
    updates: Partial<QueuedOperation>,
  ): boolean {
    const op = this.queue.find(
      (op) => op.entityType === entityType && op.entityId === entityId,
    );
    if (op) {
      Object.assign(op, updates);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Clear all pending operations (used on logout)
   */
  clear(): void {
    this.queue = [];
    this.saveToStorage();
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();
