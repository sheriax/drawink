/**
 * Firebase Storage Helper (Hybrid Architecture)
 *
 * This module handles file uploads/downloads to Firebase Storage.
 * Metadata is stored in Convex, actual files in Firebase Storage.
 *
 * Why Firebase Storage?
 * - 19x cheaper than Convex file storage ($0.026/GB vs $0.50/GB)
 * - 10x larger free tier (5GB vs 0.5GB)
 * - Google Cloud CDN for global delivery
 * - Proven at scale
 */

import { initializeApp } from "firebase/app";
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

// =========================================================================
// Firebase Initialization (Storage Only)
// =========================================================================

let firebaseApp: ReturnType<typeof initializeApp> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;

const initFirebase = () => {
  if (!firebaseApp) {
    const firebaseConfig = JSON.parse(import.meta.env.VITE_APP_FIREBASE_CONFIG);
    firebaseApp = initializeApp(firebaseConfig);
  }
  return firebaseApp;
};

const getStorageInstance = () => {
  if (!storage) {
    storage = getStorage(initFirebase());
  }
  return storage;
};

// =========================================================================
// Upload Functions
// =========================================================================

export interface UploadOptions {
  path: string; // e.g., "boards/{boardId}/images/{filename}"
  metadata?: Record<string, string>;
  onProgress?: (progress: number) => void;
}

/**
 * Upload a file to Firebase Storage
 * @returns Firebase Storage download URL
 */
export const uploadFile = async (
  file: File | Blob,
  options: UploadOptions,
): Promise<{ url: string; path: string }> => {
  const storageInstance = getStorageInstance();
  const storageRef = ref(storageInstance, options.path);

  // Upload with metadata
  await uploadBytes(storageRef, file, {
    cacheControl: "public, max-age=31536000", // 1 year cache
    contentType: file.type || "application/octet-stream",
    customMetadata: options.metadata,
  });

  // Get public download URL
  const url = await getDownloadURL(storageRef);

  return { url, path: options.path };
};

/**
 * Upload image with compression (optional)
 */
export const uploadImage = async (
  file: File,
  options: Omit<UploadOptions, "path"> & { boardId: string; fileId: string },
): Promise<{ url: string; path: string }> => {
  const path = `boards/${options.boardId}/images/${options.fileId}`;

  return uploadFile(file, {
    path,
    metadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      ...options.metadata,
    },
  });
};

/**
 * Upload thumbnail
 */
export const uploadThumbnail = async (
  blob: Blob,
  boardId: string,
): Promise<{ url: string; path: string }> => {
  const path = `boards/${boardId}/thumbnail.png`;

  return uploadFile(blob, {
    path,
    metadata: {
      type: "thumbnail",
      generatedAt: new Date().toISOString(),
    },
  });
};

// =========================================================================
// Download Functions
// =========================================================================

/**
 * Get download URL for a file
 */
export const getFileUrl = async (path: string): Promise<string> => {
  const storageInstance = getStorageInstance();
  const storageRef = ref(storageInstance, path);
  return await getDownloadURL(storageRef);
};

/**
 * Download file as blob
 */
export const downloadFile = async (path: string): Promise<Blob> => {
  const url = await getFileUrl(path);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  return await response.blob();
};

// =========================================================================
// Delete Functions
// =========================================================================

/**
 * Delete a file from Firebase Storage
 */
export const deleteFile = async (path: string): Promise<void> => {
  const storageInstance = getStorageInstance();
  const storageRef = ref(storageInstance, path);
  await deleteObject(storageRef);
};

/**
 * Delete all files for a board (called on board deletion)
 */
export const deleteboardFiles = async (boardId: string): Promise<void> => {
  // Note: Firebase Storage doesn't support directory deletion
  // We need to delete files individually
  // This should be called from a Convex action/mutation that knows all file paths

  // For now, just log - actual deletion should be done via cleanup job
  console.warn(`Board ${boardId} files should be deleted via cleanup job`);
};

// =========================================================================
// Helper Functions
// =========================================================================

/**
 * Generate a unique file ID
 */
export const generateFileId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
};

/**
 * Check if file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith("image/");
};

/**
 * Validate file size (default 10MB max)
 */
export const validateFileSize = (file: File, maxSizeMB = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

// =========================================================================
// Integration with Convex
// =========================================================================

/**
 * Upload file and save metadata to Convex
 *
 * Usage:
 *   const result = await uploadFileWithMetadata(file, boardId, convexMutation);
 */
export const uploadFileWithMetadata = async (
  file: File,
  boardId: string,
  saveMetadata: (data: {
    boardId: string;
    fileId: string;
    firebaseStorageUrl: string;
    firebaseStoragePath: string;
    mimeType: string;
    sizeBytes: number;
  }) => Promise<any>,
): Promise<{ fileId: string; url: string }> => {
  // Validate file
  if (!validateFileSize(file)) {
    throw new Error("File size exceeds 10MB limit");
  }

  // Generate file ID
  const fileId = generateFileId();

  // Upload to Firebase Storage
  const { url, path } = await uploadImage(file, {
    boardId,
    fileId,
  });

  // Save metadata to Convex
  await saveMetadata({
    boardId,
    fileId,
    firebaseStorageUrl: url,
    firebaseStoragePath: path,
    mimeType: file.type,
    sizeBytes: file.size,
  });

  return { fileId, url };
};
