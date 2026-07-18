/**
 * Convex Collaboration Adapter
 *
 * Persists end-to-end encrypted collaborative scenes in Convex.
 */

import { reconcileElements } from "@/core";
import { decryptData, encryptData } from "@/core/data/encryption";
import type { RemoteDrawinkElement } from "@/core/data/reconcile";
import { restoreElements } from "@/core/data/restore";
import type { AppState } from "@/core/types";
import { getSceneVersion } from "@/lib/elements";
import type { DrawinkElement, OrderedDrawinkElement } from "@/lib/elements/types";
import { ConvexHttpClient } from "convex/browser";
import type { SyncableDrawinkElement } from ".";
import { getSyncableElements } from ".";
import { api } from "../../convex/_generated/api";
import type Portal from "../collab/Portal";
import type { ConvexRealtimeClient } from "./ConvexRealtimeClient";
import { deriveConvexAccessToken } from "./convexAccess";

// Initialize Convex client
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("VITE_CONVEX_URL not configured");
}

const convex = new ConvexHttpClient(CONVEX_URL);

// Scene version cache prevents redundant persistence writes.
class ConvexSceneVersionCache {
  private static cache = new WeakMap<ConvexRealtimeClient, number>();

  static get = (socket: ConvexRealtimeClient) => {
    return ConvexSceneVersionCache.cache.get(socket);
  };

  static set = (socket: ConvexRealtimeClient, elements: readonly SyncableDrawinkElement[]) => {
    ConvexSceneVersionCache.cache.set(socket, getSceneVersion(elements));
  };
}

/**
 * Check if the current scene is saved to Convex
 */
export const isSavedToConvex = (portal: Portal, elements: readonly DrawinkElement[]): boolean => {
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
  elements: readonly DrawinkElement[],
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
  roomKey: string,
): Promise<readonly DrawinkElement[]> {
  const decrypted = await decryptData(iv, ciphertext, roomKey);
  const decodedData = new TextDecoder("utf-8").decode(new Uint8Array(decrypted));
  return JSON.parse(decodedData);
}

/**
 * Save a collaborative scene to Convex.
 */
export const saveToConvex = async (
  portal: Portal,
  elements: readonly SyncableDrawinkElement[],
  appState: AppState,
): Promise<readonly SyncableDrawinkElement[] | null> => {
  const { roomId, roomKey, socket } = portal;

  // Bail if no room exists
  if (!roomId || !roomKey || !socket || isSavedToConvex(portal, elements)) {
    return null;
  }

  try {
    await socket.waitUntilReady();
    const accessToken = await deriveConvexAccessToken("room", roomKey);
    // Load existing scene from Convex
    const existingScene = await convex.query(api.collaboration.loadCollaborativeScene, {
      roomId,
      accessToken,
    });

    let reconciledElements: readonly SyncableDrawinkElement[];

    if (existingScene) {
      // Reconcile with existing scene
      const prevStoredElements = getSyncableElements(
        restoreElements(
          await decryptElements(
            new Uint8Array(existingScene.ciphertext),
            new Uint8Array(existingScene.iv),
            roomKey,
          ),
          null,
        ),
      );

      reconciledElements = getSyncableElements(
        reconcileElements(
          elements,
          prevStoredElements as OrderedDrawinkElement[] as RemoteDrawinkElement[],
          appState,
        ),
      );
    } else {
      // First save, no reconciliation needed
      reconciledElements = elements;
    }

    // Encrypt reconciled elements
    const sceneVersion = getSceneVersion(reconciledElements);
    const { ciphertext, iv } = await encryptElements(roomKey, reconciledElements);

    // Save to Convex
    // Convex v.bytes() expects ArrayBuffer, not Uint8Array
    await convex.mutation(api.collaboration.saveCollaborativeScene, {
      roomId,
      accessToken,
      sessionId: socket.id,
      ciphertext:
        ciphertext instanceof ArrayBuffer
          ? ciphertext
          : (new Uint8Array(ciphertext).buffer as ArrayBuffer),
      iv: iv instanceof ArrayBuffer ? iv : (iv.buffer as ArrayBuffer),
      sceneVersion,
    });

    // Update cache
    ConvexSceneVersionCache.set(socket, reconciledElements);

    return reconciledElements;
  } catch (error) {
    console.error("[ConvexCollab] Save failed:", error);
    throw error;
  }
};

/**
 * Load a collaborative scene from Convex.
 */
export const loadFromConvex = async (
  roomId: string,
  roomKey: string,
  socket: ConvexRealtimeClient | null,
): Promise<readonly SyncableDrawinkElement[] | null> => {
  try {
    const scene = await convex.query(api.collaboration.loadCollaborativeScene, {
      roomId,
      accessToken: await deriveConvexAccessToken("room", roomKey),
    });

    if (!scene) {
      return null; // Room doesn't exist yet
    }

    // Decrypt elements
    const elements = getSyncableElements(
      restoreElements(
        await decryptElements(new Uint8Array(scene.ciphertext), new Uint8Array(scene.iv), roomKey),
        null,
        { deleteInvisibleElements: true },
      ),
    );

    // Update cache
    if (socket) {
      ConvexSceneVersionCache.set(socket, elements);
    }

    return elements;
  } catch (error) {
    console.error("[ConvexCollab] Load failed:", error);
    throw error;
  }
};
