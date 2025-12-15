import { base64urlToString } from "@drawink/drawink/data/encode";
import { DrawinkError } from "@drawink/drawink/errors";
import { useLayoutEffect, useRef } from "react";

import type { FileId, OrderedDrawinkElement } from "@drawink/element/types";
import type { AppState, BinaryFileData } from "@drawink/drawink/types";

import { STORAGE_KEYS } from "./app_constants";
import { hybridStorageAdapter } from "./data/HybridStorageAdapter";

const EVENT_REQUEST_SCENE = "REQUEST_SCENE";

const EXCALIDRAW_PLUS_ORIGIN = import.meta.env.VITE_APP_PLUS_APP;

// -----------------------------------------------------------------------------
// outgoing message
// -----------------------------------------------------------------------------
type MESSAGE_REQUEST_SCENE = {
  type: "REQUEST_SCENE";
  jwt: string;
};

type MESSAGE_FROM_PLUS = MESSAGE_REQUEST_SCENE;

// incoming messages
// -----------------------------------------------------------------------------
type MESSAGE_READY = { type: "READY" };
type MESSAGE_ERROR = { type: "ERROR"; message: string };
type MESSAGE_SCENE_DATA = {
  type: "SCENE_DATA";
  elements: OrderedDrawinkElement[];
  appState: Pick<AppState, "viewBackgroundColor">;
  files: { loadedFiles: BinaryFileData[]; erroredFiles: Map<FileId, true> };
};

type MESSAGE_FROM_EDITOR = MESSAGE_ERROR | MESSAGE_SCENE_DATA | MESSAGE_READY;
// -----------------------------------------------------------------------------

const parseSceneData = async ({
  rawElementsString,
  rawAppStateString,
}: {
  rawElementsString: string | null;
  rawAppStateString: string | null;
}): Promise<MESSAGE_SCENE_DATA> => {
  if (!rawElementsString || !rawAppStateString) {
    throw new DrawinkError("Elements or appstate is missing.");
  }

  try {
    const elements = JSON.parse(rawElementsString) as OrderedDrawinkElement[];

    if (!elements.length) {
      throw new DrawinkError("Scene is empty, nothing to export.");
    }

    const appState = JSON.parse(rawAppStateString) as Pick<
      AppState,
      "viewBackgroundColor"
    >;

    const fileIds = elements.reduce((acc, el) => {
      if ("fileId" in el && el.fileId) {
        acc.push(el.fileId);
      }
      return acc;
    }, [] as FileId[]);

    const files = await hybridStorageAdapter.fileStorage.getFiles(fileIds);

    return {
      type: "SCENE_DATA",
      elements,
      appState,
      files,
    };
  } catch (error: any) {
    throw error instanceof DrawinkError
      ? error
      : new DrawinkError("Failed to parse scene data.");
  }
};

const verifyJWT = async ({
  token,
  publicKey,
}: {
  token: string;
  publicKey: string;
}) => {
  try {
    if (!publicKey) {
      throw new DrawinkError("Public key is undefined");
    }

    const [header, payload, signature] = token.split(".");

    if (!header || !payload || !signature) {
      throw new DrawinkError("Invalid JWT format");
    }

    // JWT is using Base64URL encoding
    const decodedPayload = base64urlToString(payload);
    const decodedSignature = base64urlToString(signature);

    const data = `${header}.${payload}`;
    const signatureArrayBuffer = Uint8Array.from(decodedSignature, (c) =>
      c.charCodeAt(0),
    );

    const keyData = publicKey.replace(/-----\w+ PUBLIC KEY-----/g, "");
    const keyArrayBuffer = Uint8Array.from(atob(keyData), (c) =>
      c.charCodeAt(0),
    );

    const key = await crypto.subtle.importKey(
      "spki",
      keyArrayBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      true,
      ["verify"],
    );

    const isValid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      signatureArrayBuffer,
      new TextEncoder().encode(data),
    );

    if (!isValid) {
      throw new Error("Invalid JWT");
    }

    const parsedPayload = JSON.parse(decodedPayload);

    // Check for expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (parsedPayload.exp && parsedPayload.exp < currentTime) {
      throw new Error("JWT has expired");
    }
  } catch (error) {
    console.error("Failed to verify JWT:", error);
    throw new Error(error instanceof Error ? error.message : "Invalid JWT");
  }
};

export const DrawinkPlusIframeExport = () => {
  const readyRef = useRef(false);

  useLayoutEffect(() => {
    const handleMessage = async (event: MessageEvent<MESSAGE_FROM_PLUS>) => {
      if (event.origin !== EXCALIDRAW_PLUS_ORIGIN) {
        throw new DrawinkError("Invalid origin");
      }

      if (event.data.type === EVENT_REQUEST_SCENE) {
        if (!event.data.jwt) {
          throw new DrawinkError("JWT is missing");
        }

        try {
          try {
            await verifyJWT({
              token: event.data.jwt,
              publicKey: import.meta.env.VITE_APP_PLUS_EXPORT_PUBLIC_KEY,
            });
          } catch (error: any) {
            console.error(`Failed to verify JWT: ${error.message}`);
            throw new DrawinkError("Failed to verify JWT");
          }

          const parsedSceneData: MESSAGE_SCENE_DATA = await parseSceneData({
            rawAppStateString: localStorage.getItem(
              STORAGE_KEYS.LOCAL_STORAGE_APP_STATE,
            ),
            rawElementsString: localStorage.getItem(
              STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS,
            ),
          });

          event.source!.postMessage(parsedSceneData, {
            targetOrigin: EXCALIDRAW_PLUS_ORIGIN,
          });
        } catch (error) {
          const responseData: MESSAGE_ERROR = {
            type: "ERROR",
            message:
              error instanceof DrawinkError
                ? error.message
                : "Failed to export scene data",
          };
          event.source!.postMessage(responseData, {
            targetOrigin: EXCALIDRAW_PLUS_ORIGIN,
          });
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // so we don't send twice in StrictMode
    if (!readyRef.current) {
      readyRef.current = true;
      const message: MESSAGE_FROM_EDITOR = { type: "READY" };
      window.parent.postMessage(message, EXCALIDRAW_PLUS_ORIGIN);
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Since this component is expected to run in a hidden iframe on Excaildraw+,
  // it doesn't need to render anything. All the data we need is available in
  // LocalStorage and IndexedDB. It only needs to handle the messaging between
  // the parent window and the iframe with the relevant data.
  return null;
};
