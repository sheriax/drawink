/**
 * Storage Adapter Interface
 *
 * This interface abstracts storage operations for boards and their content.
 * It can be implemented by LocalStorageAdapter, CloudStorageAdapter, or HybridStorageAdapter.
 */

import type { DrawinkElement } from "@/lib/elements/types";
import type { AppState, Board } from "../types";

/**
 * Represents the content of a board (elements and app state)
 */
export interface BoardContent {
  elements: DrawinkElement[];
  appState: Partial<AppState>;
  version?: number;
  updatedAt?: number;
}

/**
 * Workspace for cloud users (not used in local mode)
 */
export interface Workspace {
  id: string;
  name: string;
  ownerUserId: string;
  createdAt: number;
  updatedAt: number;
  memberCount?: number;
}

/**
 * Storage adapter interface that abstracts board storage operations.
 * Implemented by LocalStorageAdapter and CloudStorageAdapter.
 */
export interface StorageAdapter {
  // Board operations
  getBoards(): Promise<Board[]>;
  createBoard(name: string): Promise<string>;
  createBoardWithId?(id: string, name: string): Promise<string>;
  updateBoard(id: string, data: Partial<Board>): Promise<void>;
  deleteBoard(id: string): Promise<void>;
  getCurrentBoardId(): Promise<string | null>;
  setCurrentBoardId(id: string): Promise<void>;

  // Board content operations
  getBoardContent(boardId: string): Promise<BoardContent>;
  saveBoardContent(boardId: string, content: BoardContent): Promise<void>;

  // Workspace operations (cloud only, optional)
  getWorkspaces?(): Promise<Workspace[]>;
  createWorkspace?(name: string): Promise<string>;
  switchWorkspace?(id: string): Promise<void>;
  getCurrentWorkspaceId?(): Promise<string | null>;
}

/**
 * Sync status for cloud sync operations
 */
export type SyncStatus = "idle" | "syncing" | "error" | "offline";

/**
 * Sync state for tracking sync progress
 */
export interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;
  pendingChanges: number;
  error: string | null;
}
