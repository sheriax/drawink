/**
 * Scene service - Business logic for scene operations
 * Handles storage and retrieval of whiteboard scenes
 */

import { SCENES_COLLECTION, db } from "../firebase";

const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2MB limit

export interface SceneData {
  sceneData: string; // base64-encoded binary data
  size: number;
  createdAt: string;
}

/**
 * Generate a random scene ID (16-char hex string)
 */
export function generateSceneId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Get scene by ID
 */
export const getSceneById = async (id: string): Promise<SceneData | null> => {
  try {
    const docRef = db.collection(SCENES_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data || !data.sceneData) {
      return null;
    }

    return {
      sceneData: data.sceneData,
      size: data.size,
      createdAt: data.createdAt,
    };
  } catch (error) {
    console.error("Error getting scene:", error);
    throw error;
  }
};

/**
 * Store new scene
 */
export const storeScene = async (sceneData: string): Promise<string> => {
  // Check size limit
  const buffer = Buffer.from(sceneData, "base64");
  if (buffer.byteLength > MAX_BODY_SIZE) {
    throw new Error("Scene data too large (max 2MB)");
  }

  const id = generateSceneId();

  try {
    // Store in Firestore
    await db.collection(SCENES_COLLECTION).doc(id).set({
      sceneData,
      createdAt: new Date().toISOString(),
      size: buffer.byteLength,
    });

    return id;
  } catch (error) {
    console.error("Error storing scene:", error);
    throw error;
  }
};
