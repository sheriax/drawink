/**
 * Convex Collaboration Adapter
 *
 * Replaces Firebase Firestore for collaborative scene storage.
 * Firebase Storage is still used for file uploads (cost-effective for large binaries).
 *
 * This file provides saveToConvex() and loadFromConvex() functions
 * that work similarly to the old Firebase saveToFirebase() / loadFromFirebase().
 */

import { reconcileElements } from "@/core";
import { decryptData, encryptData } from "@/core/data/encryption";
import { restoreElements } from "@/core/data/restore";
import { getSceneVersion } from "@/lib/elements";
import type { AppState } from "@/core/types";
import type { DrawinkElement, OrderedDrawinkElement } from "@/lib/elements/types";
import type { RemoteDrawinkElement } from "@/core/data/reconcile";
import type Portal from "../collab/Portal";
import type { Socket } from "socket.io-client";
import type { SyncableDrawinkElement } from ".";
import { getSyncableElements } from ".";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

// Initialize Convex client
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("VITE_CONVEX_URL not configured");
}

const convex = new ConvexHttpClient(CONVEX_URL);

// Scene version cache (same as Firebase implementation)
class ConvexSceneVersionCache {
  private static cache = new WeakMap<Socket, number>();

  static get = (socket: Socket) => {
    return ConvexSceneVersionCache.cache.get(socket);
  };

  static set = (socket: Socket, elements: readonly SyncableDrawinkElement[]) => {
    ConvexSceneVersionCache.cache.set(socket, getSceneVersion(elements));
  };
}

/**
 * Check if the current scene is saved to Convex
 */
export const isSavedToConvex = (
  portal: Portal,
  elements: readonly DrawinkElement[]
): boolean => {
  if (portal.socket && portal.roomId && portal.roomKey) {
    const sceneVersion = getSceneVersion(elements);
    return ConvexSceneVersionCache.get(portal.socket) === sceneVersion;
  }
  return true;
};

/**
 * Encrypt elements for storage
 */
async function encryptElements(
  key: string,
  elements: readonly DrawinkElement[]
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const json = JSON.stringify(elements);
  const encoded = new TextEncoder().encode(json);
  const { encryptedBuffer, iv } = await encryptData(key, encoded);
  return { ciphertext: encryptedBuffer, iv };
}

/**
 * Decrypt elements from storage
 */
async function decryptElements(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  roomKey: string
): Promise<readonly DrawinkElement[]> {
  const decrypted = await decryptData(iv, ciphertext, roomKey);
  const decodedData = new TextDecoder("utf-8").decode(new Uint8Array(decrypted));
  return JSON.parse(decodedData);
}

/**
 * Save collaborative scene to Convex (replaces saveToFirebase)
 */
export const saveToConvex = async (
  portal: Portal,
  elements: readonly SyncableDrawinkElement[],
  appState: AppState
): Promise<readonly SyncableDrawinkElement[] | null> => {
  const { roomId, roomKey, socket } = portal;

  // Bail if no room exists
  if (!roomId || !roomKey || !socket || isSavedToConvex(portal, elements)) {
    return null;
  }

  try {
    // Load existing scene from Convex
    const existingScene = await convex.query(api.collaboration.loadCollaborativeScene, {
      roomId,
    });

    let reconciledElements: readonly SyncableDrawinkElement[];

    if (existingScene) {
      // Reconcile with existing scene
      const prevStoredElements = getSyncableElements(
        restoreElements(
          await decryptElements(
            new Uint8Array(existingScene.ciphertext),
            new Uint8Array(existingScene.iv),
            roomKey
          ),
          null
        )
      );

      reconciledElements = getSyncableElements(
        reconcileElements(
          elements,
          prevStoredElements as OrderedDrawinkElement[] as RemoteDrawinkElement[],
          appState
        )
      );
    } else {
      // First save, no reconciliation needed
      reconciledElements = elements;
    }

    // Encrypt reconciled elements
    const sceneVersion = getSceneVersion(reconciledElements);
    const { ciphertext, iv } = await encryptElements(roomKey, reconciledElements);

    // Save to Convex
    await convex.mutation(api.collaboration.saveCollaborativeScene, {
      roomId,
      ciphertext: new Uint8Array(ciphertext),
      iv,
      sceneVersion,
      lastEditedBy: undefined, // Optional: could pass Clerk user ID if authenticated
    });

    // Update cache
    ConvexSceneVersionCache.set(socket, reconciledElements);

    return reconciledElements;
  } catch (error: any) {
    console.error("[ConvexCollab] Save failed:", error);
    throw error;
  }
};

/**
 * Load collaborative scene from Convex (replaces loadFromFirebase)
 */
export const loadFromConvex = async (
  roomId: string,
  roomKey: string,
  socket: Socket | null
): Promise<readonly SyncableDrawinkElement[] | null> => {
  try {
    const scene = await convex.query(api.collaboration.loadCollaborativeScene, {
      roomId,
    });

    if (!scene) {
      return null; // Room doesn't exist yet
    }

    // Decrypt elements
    const elements = getSyncableElements(
      restoreElements(
        await decryptElements(
          new Uint8Array(scene.ciphertext),
          new Uint8Array(scene.iv),
          roomKey
        ),
        null,
        { deleteInvisibleElements: true }
      )
    );

    // Update cache
    if (socket) {
      ConvexSceneVersionCache.set(socket, elements);
    }

    return elements;
  } catch (error: any) {
    console.error("[ConvexCollab] Load failed:", error);
    throw error;
  }
};
