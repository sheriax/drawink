import { decompressData } from "@/core/data/encode";
import { MIME_TYPES } from "@/lib/common";
import { ConvexHttpClient } from "convex/browser";

import type { BinaryFileData, BinaryFileMetadata, DataURL } from "@/core/types";
import type { FileId } from "@/lib/elements/types";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export type ConvexFileScope = "room" | "publicShare" | "legacyShare";

type FileScope = {
  scope: ConvexFileScope;
  scopeId: string;
  accessToken?: string;
};

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL not configured");
}

const convex = new ConvexHttpClient(convexUrl);

const uploadOne = async (owner: FileScope, file: { id: FileId; buffer: Uint8Array }) => {
  const uploadUrl = await convex.mutation(api.files.generateUploadUrl, owner);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": MIME_TYPES.binary },
    body: file.buffer,
  });
  if (!response.ok) {
    throw new Error(`Convex file upload failed with status ${response.status}`);
  }

  const result = (await response.json()) as { storageId?: string };
  if (!result.storageId) {
    throw new Error("Convex file upload did not return a storage ID");
  }

  const storageId = result.storageId as Id<"_storage">;
  try {
    await convex.mutation(api.files.registerUpload, {
      ...owner,
      fileId: file.id,
      storageId,
    });
  } catch (error) {
    await convex
      .mutation(api.files.discardUpload, { ...owner, storageId })
      .catch((cleanupError) => console.error("Failed to discard orphaned upload", cleanupError));
    throw error;
  }
};

export const saveFilesToConvex = async ({
  files,
  ...owner
}: FileScope & {
  files: { id: FileId; buffer: Uint8Array }[];
}) => {
  const erroredFiles: FileId[] = [];
  const savedFiles: FileId[] = [];

  await Promise.all(
    files.map(async (file) => {
      try {
        await uploadOne(owner, file);
        savedFiles.push(file.id);
      } catch (error) {
        erroredFiles.push(file.id);
        console.error("Failed to save encrypted file to Convex", error);
      }
    }),
  );

  return { savedFiles, erroredFiles };
};

export const loadFilesFromConvex = async ({
  decryptionKey,
  fileIds,
  ...owner
}: FileScope & {
  decryptionKey: string;
  fileIds: readonly FileId[];
}) => {
  const uniqueFileIds = [...new Set(fileIds)];
  const loadedFiles: BinaryFileData[] = [];
  const erroredFiles = new Map<FileId, true>();

  if (uniqueFileIds.length === 0) {
    return { loadedFiles, erroredFiles };
  }

  const downloadBatches = await Promise.all(
    Array.from({ length: Math.ceil(uniqueFileIds.length / 100) }, (_, index) =>
      convex.query(api.files.getDownloadUrls, {
        ...owner,
        fileIds: uniqueFileIds.slice(index * 100, (index + 1) * 100),
      }),
    ),
  );
  const downloads = downloadBatches.flat();
  const urls = new Map(downloads.map((download) => [download.fileId, download.url]));

  await Promise.all(
    uniqueFileIds.map(async (id) => {
      const url = urls.get(id);
      if (!url) {
        erroredFiles.set(id, true);
        return;
      }

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Convex file download failed with status ${response.status}`);
        }

        const { data, metadata } = await decompressData<BinaryFileMetadata>(
          new Uint8Array(await response.arrayBuffer()),
          { decryptionKey },
        );
        const created = metadata.created || Date.now();
        loadedFiles.push({
          mimeType: metadata.mimeType || MIME_TYPES.binary,
          id,
          dataURL: new TextDecoder().decode(data) as DataURL,
          created,
          lastRetrieved: created,
        });
      } catch (error) {
        erroredFiles.set(id, true);
        console.error("Failed to load encrypted file from Convex", error);
      }
    }),
  );

  return { loadedFiles, erroredFiles };
};
