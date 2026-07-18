import { compressData, decompressData } from "@/core/data/encode";
import { IV_LENGTH_BYTES, decryptData, generateEncryptionKey } from "@/core/data/encryption";
import { serializeAsJSON } from "@/core/data/json";
import { restore } from "@/core/data/restore";
import { t } from "@/core/i18n";
import { bytesToHexString } from "@/lib/common";
import { isInvisiblySmallElement } from "@/lib/elements";
import { isInitializedImageElement } from "@/lib/elements";

import type { ImportedDataState } from "@/core/data/types";
import type { AppState, BinaryFileData, BinaryFiles, SocketId } from "@/core/types";
import type { UserIdleState } from "@/lib/common";
import type { MakeBrand } from "@/lib/common/utility-types";
import type { SceneBounds } from "@/lib/elements";
import type { DrawinkElement, FileId, OrderedDrawinkElement } from "@/lib/elements/types";

import { DELETED_ELEMENT_TIMEOUT, FILE_UPLOAD_MAX_BYTES, ROOM_ID_BYTES } from "../app_constants";

import { encodeFilesForUpload } from "./FileManager";
import { deriveConvexAccessToken } from "./convexAccess";
import { saveFilesToConvex } from "./convexFiles";

import type { Id } from "../../convex/_generated/dataModel";
import type { WS_SUBTYPES } from "../app_constants";

export type SyncableDrawinkElement = OrderedDrawinkElement & MakeBrand<"SyncableDrawinkElement">;

export const isSyncableElement = (
  element: OrderedDrawinkElement,
): element is SyncableDrawinkElement => {
  if (element.isDeleted) {
    if (element.updated > Date.now() - DELETED_ELEMENT_TIMEOUT) {
      return true;
    }
    return false;
  }
  return !isInvisiblySmallElement(element);
};

export const getSyncableElements = (elements: readonly OrderedDrawinkElement[]) =>
  elements.filter((element) => isSyncableElement(element)) as SyncableDrawinkElement[];

const generateRoomId = async () => {
  const buffer = new Uint8Array(ROOM_ID_BYTES);
  window.crypto.getRandomValues(buffer);
  return bytesToHexString(buffer);
};

export type EncryptedData = {
  data: ArrayBuffer;
  iv: Uint8Array;
};

export type SocketUpdateDataSource = {
  INVALID_RESPONSE: {
    type: WS_SUBTYPES.INVALID_RESPONSE;
  };
  SCENE_INIT: {
    type: WS_SUBTYPES.INIT;
    payload: {
      elements: readonly DrawinkElement[];
    };
  };
  SCENE_UPDATE: {
    type: WS_SUBTYPES.UPDATE;
    payload: {
      elements: readonly DrawinkElement[];
    };
  };
  MOUSE_LOCATION: {
    type: WS_SUBTYPES.MOUSE_LOCATION;
    payload: {
      socketId: SocketId;
      pointer: { x: number; y: number; tool: "pointer" | "laser" };
      button: "down" | "up";
      selectedElementIds: AppState["selectedElementIds"];
      username: string;
    };
  };
  USER_VISIBLE_SCENE_BOUNDS: {
    type: WS_SUBTYPES.USER_VISIBLE_SCENE_BOUNDS;
    payload: {
      socketId: SocketId;
      username: string;
      sceneBounds: SceneBounds;
    };
  };
  IDLE_STATUS: {
    type: WS_SUBTYPES.IDLE_STATUS;
    payload: {
      socketId: SocketId;
      userState: UserIdleState;
      username: string;
    };
  };
};

export type SocketUpdateDataIncoming = SocketUpdateDataSource[keyof SocketUpdateDataSource];

export type SocketUpdateData = SocketUpdateDataSource[keyof SocketUpdateDataSource] & {
  _brand: "socketUpdateData";
};

const RE_COLLAB_LINK = /^#room=([a-zA-Z0-9_-]+),([a-zA-Z0-9_-]+)$/;

export const isCollaborationLink = (link: string) => {
  const hash = new URL(link).hash;
  return RE_COLLAB_LINK.test(hash);
};

export const getCollaborationLinkData = (link: string) => {
  const hash = new URL(link).hash;
  const match = hash.match(RE_COLLAB_LINK);
  if (match && match[2].length !== 22) {
    window.alert(t("alerts.invalidEncryptionKey"));
    return null;
  }
  return match ? { roomId: match[1], roomKey: match[2] } : null;
};

export const generateCollaborationLinkData = async () => {
  const roomId = await generateRoomId();
  const roomKey = await generateEncryptionKey();

  if (!roomKey) {
    throw new Error("Couldn't generate room key");
  }

  return { roomId, roomKey };
};

export const getCollaborationLink = (data: {
  roomId: string;
  roomKey: string;
}) => {
  // Always use root origin — don't include /workspace/... path in collab links
  return `${window.location.origin}/#room=${data.roomId},${data.roomKey}`;
};

/**
 * Decodes shareLink data using the legacy buffer format.
 * @deprecated
 */
const decodeLegacyShare = async ({
  buffer,
  decryptionKey,
}: {
  buffer: ArrayBuffer;
  decryptionKey: string;
}) => {
  let decrypted: ArrayBuffer;

  try {
    // Buffer should contain both the IV (fixed length) and encrypted data
    const iv = buffer.slice(0, IV_LENGTH_BYTES);
    const encrypted = buffer.slice(IV_LENGTH_BYTES, buffer.byteLength);
    decrypted = await decryptData(new Uint8Array(iv), encrypted, decryptionKey);
  } catch {
    // Fixed IV (old format, backward compatibility)
    const fixedIv = new Uint8Array(IV_LENGTH_BYTES);
    decrypted = await decryptData(fixedIv, buffer, decryptionKey);
  }

  // We need to convert the decrypted array buffer to a string
  const string = new window.TextDecoder("utf-8").decode(new Uint8Array(decrypted));
  const data: ImportedDataState = JSON.parse(string);

  return {
    elements: data.elements || null,
    appState: data.appState || null,
  };
};

/**
 * Import a public share from Convex using a proof derived from its fragment key.
 */
export const importFromConvex = async (
  shareId: string,
  decryptionKey: string,
): Promise<ImportedDataState> => {
  try {
    const convexUrl = import.meta.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("Convex URL not configured");
    }

    const { ConvexHttpClient } = await import("convex/browser");
    const { api } = await import("../../convex/_generated/api");
    const convex = new ConvexHttpClient(convexUrl);
    const accessToken = await deriveConvexAccessToken("publicShare", decryptionKey);

    const share = await convex.query(api.publicShares.getPublicShare, {
      shareId: shareId as Id<"publicShares">,
      accessToken,
    });

    // Decompress and decrypt the payload
    const { data: decodedBuffer } = await decompressData(new Uint8Array(share.payload), {
      decryptionKey,
    });

    const data: ImportedDataState = JSON.parse(new TextDecoder().decode(decodedBuffer));

    return {
      elements: data.elements || null,
      appState: data.appState || null,
    };
  } catch (error) {
    window.alert(t("alerts.importBackendFailed"));
    console.error("Failed to load share from Convex:", error);
    return {};
  }
};

export const importLegacyShareFromConvex = async (
  shortId: string,
  decryptionKey: string,
): Promise<ImportedDataState> => {
  try {
    const convexUrl = import.meta.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("Convex URL not configured");
    }

    const { ConvexHttpClient } = await import("convex/browser");
    const { api } = await import("../../convex/_generated/api");
    const convex = new ConvexHttpClient(convexUrl);
    const accessToken = await deriveConvexAccessToken("legacyShare", decryptionKey);
    const share = await convex.query(api.publicShares.getPublicShareByShortId, {
      shortId,
      accessToken,
    });
    const buffer = share.payload;

    try {
      const { data: decodedBuffer } = await decompressData(new Uint8Array(buffer), {
        decryptionKey,
      });
      const data: ImportedDataState = JSON.parse(new TextDecoder().decode(decodedBuffer));

      return {
        elements: data.elements || null,
        appState: data.appState || null,
      };
    } catch (error) {
      console.warn("error when decoding shareLink data using the new format:", error);
      return decodeLegacyShare({ buffer, decryptionKey });
    }
  } catch (error) {
    window.alert(t("alerts.importBackendFailed"));
    console.error(error);
    return {};
  }
};

export const loadScene = async (
  id: string | null,
  privateKey: string | null,
  // Supply local state even if importing from backend to ensure we restore
  // localStorage user settings which we do not persist on server.
  // Non-optional so we don't forget to pass it even if `undefined`.
  localDataState: ImportedDataState | undefined | null,
) => {
  let data;
  if (id != null && privateKey != null) {
    // the private key is used to decrypt the content from the server, take
    // extra care not to leak it
    data = restore(
      await importLegacyShareFromConvex(id, privateKey),
      localDataState?.appState,
      localDataState?.elements,
      {
        repairBindings: true,
        refreshDimensions: false,
        deleteInvisibleElements: true,
      },
    );
  } else {
    data = restore(localDataState || null, null, null, {
      repairBindings: true,
      deleteInvisibleElements: true,
    });
  }

  return {
    elements: data.elements,
    appState: data.appState,
    // note: this will always be empty because we're not storing files
    // in the scene database/localStorage, and instead fetch them async
    // from a different database
    files: data.files,
  };
};

type ExportToBackendResult =
  | { url: null; errorMessage: string }
  | { url: string; errorMessage: null };

export const exportToBackend = async (
  elements: readonly DrawinkElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
): Promise<ExportToBackendResult> => {
  const encryptionKey = await generateEncryptionKey("string");

  const payload = await compressData(
    new TextEncoder().encode(serializeAsJSON(elements, appState, files, "database")),
    { encryptionKey },
  );

  try {
    const convexUrl = import.meta.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("Convex URL not configured");
    }

    const { ConvexHttpClient } = await import("convex/browser");
    const { api } = await import("../../convex/_generated/api");
    const convex = new ConvexHttpClient(convexUrl);
    const accessToken = await deriveConvexAccessToken("publicShare", encryptionKey);
    const result = await convex.mutation(api.publicShares.createPublicShare, {
      payload: new Uint8Array(payload).buffer as ArrayBuffer,
      title: "Shared Drawing",
      accessToken,
    });

    const shareId = result.shareId;
    const filesMap = new Map<FileId, BinaryFileData>();
    for (const element of elements) {
      if (isInitializedImageElement(element) && files[element.fileId]) {
        filesMap.set(element.fileId, files[element.fileId]);
      }
    }

    if (filesMap.size > 0) {
      await saveFilesToConvex({
        scope: "publicShare",
        scopeId: shareId,
        accessToken,
        files: await encodeFilesForUpload({
          files: filesMap,
          encryptionKey,
          maxBytes: FILE_UPLOAD_MAX_BYTES,
        }),
      });
    }

    const url = new URL(window.location.origin);
    url.hash = `share=${shareId},${encryptionKey}`;
    return { url: url.toString(), errorMessage: null };
  } catch (error) {
    console.error(error);

    return { url: null, errorMessage: t("alerts.couldNotCreateShareableLink") };
  }
};
