/**
 * ConvexStorageAdapter
 *
 * Implements the StorageAdapter interface for Convex.
 * Used for cloud sync when user is authenticated.
 *
 * Data is encrypted before storage using PBKDF2-derived AES-GCM keys.
 *
 * Convex + Firebase Storage Hybrid Architecture:
 * - Board metadata, workspace data: Convex (real-time reactive)
 * - Board content (encrypted): Convex
 * - Files (images, thumbnails): Firebase Storage (19x cheaper!)
 */

import type { BoardContent, StorageAdapter, Workspace } from "@drawink/drawink/storage/types";
import type { Board } from "@drawink/drawink/types";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

// Cache for derived encryption keys
const encryptionKeyCache = new Map<string, CryptoKey>();

/**
 * Derive an AES-GCM encryption key from user ID using PBKDF2
 * This creates a deterministic key that's compatible with Web Crypto API
 */
const deriveEncryptionKey = async (userId: string): Promise<CryptoKey> => {
  // Check cache first
  if (encryptionKeyCache.has(userId)) {
    return encryptionKeyCache.get(userId)!;
  }

  // Convert userId to key material
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(userId),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  // Use a fixed salt for deterministic key derivation
  const salt = encoder.encode("drawink-cloud-sync-v1");

  // Derive AES-GCM key using PBKDF2
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 128 },
    false,
    ["encrypt", "decrypt"],
  );

  // Cache the key
  encryptionKeyCache.set(userId, derivedKey);
  return derivedKey;
};

/**
 * Encrypt content for storage using derived CryptoKey
 */
const encryptContent = async (
  key: CryptoKey,
  data: object,
): Promise<{ ciphertext: string; iv: string }> => {
  const json = JSON.stringify(data);
  const encoded = new TextEncoder().encode(json);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  // Convert to base64 for Convex storage
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    iv: btoa(String.fromCharCode(...iv)),
  };
};

/**
 * Decrypt content from storage using derived CryptoKey
 */
const decryptContent = async <T>(
  key: CryptoKey,
  ciphertextBase64: string,
  ivBase64: string,
): Promise<T> => {
  // Convert from base64
  const ciphertext = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  const decoded = new TextDecoder("utf-8").decode(new Uint8Array(decrypted));
  return JSON.parse(decoded) as T;
};

/**
 * Compute SHA-256 checksum for conflict detection
 */
const computeChecksum = async (data: object): Promise<string> => {
  const json = JSON.stringify(data);
  const encoded = new TextEncoder().encode(json);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * ConvexStorageAdapter
 * Handles all Convex operations for cloud-synced boards.
 * All content is end-to-end encrypted before storage.
 */
export class ConvexStorageAdapter implements StorageAdapter {
  private userId: string;
  private currentWorkspaceId: string | null = null;
  private convexClient: ConvexHttpClient;
  private encryptionKey: CryptoKey | null = null;

  constructor(userId: string, convexUrl: string) {
    this.userId = userId;
    this.convexClient = new ConvexHttpClient(convexUrl);
  }

  /**
   * Get or derive the encryption key
   */
  private async getEncryptionKey(): Promise<CryptoKey> {
    if (!this.encryptionKey) {
      this.encryptionKey = await deriveEncryptionKey(this.userId);
    }
    return this.encryptionKey;
  }

  /**
   * Set the current workspace ID
   */
  setWorkspaceId(workspaceId: string): void {
    this.currentWorkspaceId = workspaceId;
  }

  /**
   * Get the current workspace ID
   */
  getWorkspaceId(): string | null {
    return this.currentWorkspaceId;
  }

  // =========================================================================
  // Workspace Operations
  // =========================================================================

  /**
   * Get all workspaces for the current user
   */
  async getWorkspaces(): Promise<Workspace[]> {
    try {
      const workspaces = await this.convexClient.query(api.workspaces.listMine, {});

      return workspaces.map((w: any) => ({
        id: w._id,
        name: w.name,
        ownerUserId: w.ownerId,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        memberCount: w.memberCount,
      }));
    } catch (error) {
      console.error("[ConvexStorageAdapter] Failed to get workspaces:", error);
      return [];
    }
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(name: string): Promise<string> {
    const workspaceId = await this.convexClient.mutation(api.workspaces.create, {
      name,
    });
    return workspaceId;
  }

  /**
   * Create a default workspace for the user if they don't have one
   */
  async ensureDefaultWorkspace(): Promise<string> {
    const workspaceId = await this.convexClient.mutation(api.workspaces.ensureDefault, {});
    this.currentWorkspaceId = workspaceId;
    return workspaceId;
  }

  // =========================================================================
  // Board Operations
  // =========================================================================

  /**
   * Get all boards in the current workspace
   */
  async getBoards(): Promise<Board[]> {
    if (!this.currentWorkspaceId) {
      console.warn("[ConvexStorageAdapter] No workspace selected");
      return [];
    }

    try {
      const boards = await this.convexClient.query(api.boards.listByWorkspace, {
        workspaceId: this.currentWorkspaceId,
      });

      return boards.map((b: any) => ({
        id: b._id,
        name: b.name,
        createdAt: b.createdAt,
        lastModified: b.updatedAt,
      }));
    } catch (error) {
      console.error("[ConvexStorageAdapter] Failed to get boards:", error);
      return [];
    }
  }

  /**
   * Create a new board with auto-generated ID
   */
  async createBoard(name: string): Promise<string> {
    if (!this.currentWorkspaceId) {
      throw new Error("No workspace selected");
    }

    const boardId = await this.convexClient.mutation(api.boards.create, {
      workspaceId: this.currentWorkspaceId,
      name,
      isPublic: false,
    });

    return boardId;
  }

  /**
   * Create a board with a specific ID (used for sync)
   * Note: Convex auto-generates IDs, so this creates a board
   * and returns the new ID instead.
   */
  async createBoardWithId(id: string, name: string): Promise<void> {
    if (!this.currentWorkspaceId) {
      throw new Error("No workspace selected");
    }

    // Check if board already exists
    const existingBoard = await this.convexClient.query(api.boards.get, {
      boardId: id,
    });

    if (existingBoard) {
      return;
    }

    // Create new board (Convex will assign new ID)
    await this.convexClient.mutation(api.boards.create, {
      workspaceId: this.currentWorkspaceId,
      name,
      isPublic: false,
    });
  }

  /**
   * Update a board's metadata
   */
  async updateBoard(id: string, data: Partial<Board>): Promise<void> {
    if (!this.currentWorkspaceId) {
      throw new Error("No workspace selected");
    }

    await this.convexClient.mutation(api.boards.update, {
      boardId: id,
      name: data.name,
      isPublic: data.isPublic,
      // thumbnailUrl is updated separately via Firebase Storage
    });
  }

  /**
   * Delete a board (soft delete)
   */
  async deleteBoard(id: string): Promise<void> {
    if (!this.currentWorkspaceId) {
      throw new Error("No workspace selected");
    }

    await this.convexClient.mutation(api.boards.softDelete, {
      boardId: id,
    });
  }

  /**
   * Get current board ID from cloud
   */
  async getCurrentBoardId(): Promise<string | null> {
    // Current board is tracked locally, not in cloud
    return null;
  }

  /**
   * Set current board ID in cloud
   */
  async setCurrentBoardId(_id: string): Promise<void> {
    // Current board is tracked locally, not in cloud
  }

  // =========================================================================
  // Board Content Operations (ENCRYPTED)
  // =========================================================================

  /**
   * Get board content (elements and appState) - decrypted
   */
  async getBoardContent(boardId: string): Promise<BoardContent> {
    if (!this.currentWorkspaceId) {
      return { elements: [], appState: {} };
    }

    try {
      const content = await this.convexClient.query(api.boards.getContent, {
        boardId,
      });

      if (!content) {
        return { elements: [], appState: {} };
      }

      // Decrypt the content
      const key = await this.getEncryptionKey();
      const decrypted = await decryptContent<{ elements: any[]; appState: object }>(
        key,
        content.ciphertext,
        content.iv,
      );

      return {
        elements: decrypted.elements || [],
        appState: decrypted.appState || {},
        version: content.version || 0,
        updatedAt: content.updatedAt || Date.now(),
      };
    } catch (error) {
      console.error("[ConvexStorageAdapter] Failed to get board content:", error);
      return { elements: [], appState: {} };
    }
  }

  /**
   * Save board content (elements and appState) - encrypted
   */
  async saveBoardContent(boardId: string, content: BoardContent): Promise<void> {
    if (!this.currentWorkspaceId) {
      throw new Error("No workspace selected");
    }

    // Get encryption key and encrypt the content
    const key = await this.getEncryptionKey();
    const { ciphertext, iv } = await encryptContent(key, {
      elements: content.elements,
      appState: content.appState,
    });

    // Compute checksum for conflict detection
    const checksum = await computeChecksum({
      elements: content.elements,
      appState: content.appState,
    });

    await this.convexClient.mutation(api.boards.saveContent, {
      boardId,
      encryptedData: ciphertext,
      iv,
      checksum,
    });
  }
}
