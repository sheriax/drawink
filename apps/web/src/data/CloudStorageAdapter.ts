/**
 * CloudStorageAdapter
 *
 * Implements the StorageAdapter interface for Firebase Firestore.
 * Used for cloud sync when user is authenticated.
 *
 * Data is encrypted before storage using PBKDF2-derived AES-GCM keys.
 *
 * Firestore Structure:
 * - workspaces/{workspaceId}
 *   - boards/{boardId}
 *     - content/current (single document with encrypted elements/appState)
 */

import {
  Bytes,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import type { BoardContent, StorageAdapter, Workspace } from "@drawink/drawink/storage/types";
import type { Board } from "@drawink/drawink/types";

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
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> => {
  const json = JSON.stringify(data);
  const encoded = new TextEncoder().encode(json);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  return {
    ciphertext: new Uint8Array(encryptedBuffer),
    iv,
  };
};

/**
 * Decrypt content from storage using derived CryptoKey
 */
const decryptContent = async <T>(
  key: CryptoKey,
  ciphertext: Uint8Array,
  iv: Uint8Array,
): Promise<T> => {
  const decrypted = await window.crypto.subtle.decrypt(
    // @ts-ignore
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  const decoded = new TextDecoder("utf-8").decode(new Uint8Array(decrypted));
  return JSON.parse(decoded) as T;
};

/**
 * CloudStorageAdapter
 * Handles all Firestore operations for cloud-synced boards.
 * All content is end-to-end encrypted before storage.
 */
export class CloudStorageAdapter implements StorageAdapter {
  private userId: string;
  private currentWorkspaceId: string | null = null;
  private firestore: ReturnType<typeof getFirestore>;
  private encryptionKey: CryptoKey | null = null;

  constructor(userId: string) {
    this.userId = userId;
    this.firestore = getFirestore();
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
      const workspacesRef = collection(this.firestore, "workspaces");
      const q = query(
        workspacesRef,
        where("ownerUserId", "==", this.userId),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          ownerUserId: data.ownerUserId,
          createdAt: data.createdAt?.toMillis?.() || Date.now(),
          updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
          memberCount: data.memberCount || 1,
        };
      });
    } catch (error) {
      console.error("[CloudStorageAdapter] Failed to get workspaces:", error);
      return [];
    }
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(name: string): Promise<string> {
    const workspaceRef = doc(collection(this.firestore, "workspaces"));
    await setDoc(workspaceRef, {
      name,
      ownerUserId: this.userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      memberCount: 1,
    });
    return workspaceRef.id;
  }

  /**
   * Create a default workspace for the user if they don't have one
   */
  async ensureDefaultWorkspace(): Promise<string> {
    const workspaces = await this.getWorkspaces();
    if (workspaces.length > 0) {
      const workspaceId = workspaces[0].id;
      this.currentWorkspaceId = workspaceId;
      return workspaceId;
    }

    // Create default workspace
    const workspaceId = await this.createWorkspace("My Workspace");
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
      console.warn("[CloudStorageAdapter] No workspace selected");
      return [];
    }

    try {
      const boardsRef = collection(this.firestore, "workspaces", this.currentWorkspaceId, "boards");
      const q = query(boardsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          createdAt: data.createdAt?.toMillis?.() || Date.now(),
          lastModified: data.updatedAt?.toMillis?.() || Date.now(),
        };
      });
    } catch (error) {
      console.error("[CloudStorageAdapter] Failed to get boards:", error);
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

    const boardsRef = collection(this.firestore, "workspaces", this.currentWorkspaceId, "boards");
    const boardRef = doc(boardsRef);

    await setDoc(boardRef, {
      name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: this.userId,
    });

    return boardRef.id;
  }

  /**
   * Create a board with a specific ID (used for sync)
   */
  async createBoardWithId(id: string, name: string): Promise<void> {
    if (!this.currentWorkspaceId) {
      throw new Error("No workspace selected");
    }

    const boardRef = doc(this.firestore, "workspaces", this.currentWorkspaceId, "boards", id);

    // Check if board already exists
    const existingDoc = await getDoc(boardRef);
    if (existingDoc.exists()) {
      return;
    }

    await setDoc(boardRef, {
      name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: this.userId,
    });
  }

  /**
   * Update a board's metadata
   */
  async updateBoard(id: string, data: Partial<Board>): Promise<void> {
    if (!this.currentWorkspaceId) {
      throw new Error("No workspace selected");
    }

    const boardRef = doc(this.firestore, "workspaces", this.currentWorkspaceId, "boards", id);

    await updateDoc(boardRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete a board
   */
  async deleteBoard(id: string): Promise<void> {
    if (!this.currentWorkspaceId) {
      throw new Error("No workspace selected");
    }

    // Delete board content first
    const contentRef = doc(
      this.firestore,
      "workspaces",
      this.currentWorkspaceId,
      "boards",
      id,
      "content",
      "current",
    );
    await deleteDoc(contentRef).catch(() => {
      // Content may not exist, ignore error
    });

    // Delete board
    const boardRef = doc(this.firestore, "workspaces", this.currentWorkspaceId, "boards", id);
    await deleteDoc(boardRef);
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
      const contentRef = doc(
        this.firestore,
        "workspaces",
        this.currentWorkspaceId,
        "boards",
        boardId,
        "content",
        "current",
      );

      const snapshot = await getDoc(contentRef);
      if (!snapshot.exists()) {
        return { elements: [], appState: {} };
      }

      const data = snapshot.data();

      // Check if data is encrypted (has ciphertext field)
      if (data.ciphertext && data.iv) {
        const key = await this.getEncryptionKey();
        const ciphertext = data.ciphertext.toUint8Array();
        const iv = data.iv.toUint8Array();

        const decrypted = await decryptContent<{ elements: any[]; appState: object }>(
          key,
          ciphertext,
          iv,
        );

        return {
          elements: decrypted.elements || [],
          appState: decrypted.appState || {},
          version: data.version || 0,
          updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
        };
      }

      // Fallback for unencrypted legacy data
      return {
        elements: JSON.parse(data.elementsJSON || "[]"),
        appState: JSON.parse(data.appStateJSON || "{}"),
        version: data.version || 0,
        updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
      };
    } catch (error) {
      console.error("[CloudStorageAdapter] Failed to get board content:", error);
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

    const contentRef = doc(
      this.firestore,
      "workspaces",
      this.currentWorkspaceId,
      "boards",
      boardId,
      "content",
      "current",
    );

    // Get current version for increment
    const currentDoc = await getDoc(contentRef);
    const currentVersion = currentDoc.exists() ? currentDoc.data()?.version || 0 : 0;

    // Get encryption key and encrypt the content
    const key = await this.getEncryptionKey();
    const { ciphertext, iv } = await encryptContent(key, {
      elements: content.elements,
      appState: content.appState,
    });

    await setDoc(contentRef, {
      // Encrypted fields
      ciphertext: Bytes.fromUint8Array(ciphertext),
      iv: Bytes.fromUint8Array(iv),
      // Metadata (not encrypted)
      updatedAt: serverTimestamp(),
      updatedBy: this.userId,
      version: currentVersion + 1,
    });

    // Also update the board's updatedAt timestamp
    const boardRef = doc(this.firestore, "workspaces", this.currentWorkspaceId, "boards", boardId);
    await updateDoc(boardRef, {
      updatedAt: serverTimestamp(),
    }).catch(() => {
      // Board might have been deleted, ignore
    });
  }
}
