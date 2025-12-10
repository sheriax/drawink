import React, { useEffect, useState } from "react";
import { uploadBytes, ref } from "firebase/storage";
import { nanoid } from "nanoid";

import { trackEvent } from "@drawink/drawink/analytics";
import { Card } from "@drawink/drawink/components/Card";
import { DrawinkLogo } from "@drawink/drawink/components/DrawinkLogo";
import { ToolButton } from "@drawink/drawink/components/ToolButton";
import { MIME_TYPES } from "@drawink/common";
import {
  encryptData,
  generateEncryptionKey,
} from "@drawink/drawink/data/encryption";
import { serializeAsJSON } from "@drawink/drawink/data/json";
import { isInitializedImageElement } from "@drawink/element";
import { useI18n } from "@drawink/drawink/i18n";

import type { FileId, NonDeletedDrawinkElement } from "@drawink/element/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
} from "@drawink/drawink/types";

import { FILE_UPLOAD_MAX_BYTES } from "../app_constants";
import { encodeFilesForUpload } from "../data/FileManager";
import { loadFirebaseStorage, saveFilesToFirebase } from "../data/firebase";
import { useAuth } from "../auth";

import { WorkspaceSaveDialog } from "../share/WorkspaceSaveDialog";


import "./ExportToDrawinkPlus.scss";

export const exportToDrawinkPlus = async (
  elements: readonly NonDeletedDrawinkElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  name: string,
) => {
  const storage = await loadFirebaseStorage();

  const id = `${nanoid(12)}`;

  const encryptionKey = (await generateEncryptionKey())!;
  const encryptedData = await encryptData(
    encryptionKey,
    serializeAsJSON(elements, appState, files, "database"),
  );

  const blob = new Blob(
    // @ts-ignore
    [encryptedData.iv, new Uint8Array(encryptedData.encryptedBuffer)],
    {
      type: MIME_TYPES.binary,
    },
  );

  const storageRef = ref(storage, `/migrations/scenes/${id}`);
  await uploadBytes(storageRef, blob, {
    customMetadata: {
      data: JSON.stringify({ version: 2, name }),
      created: Date.now().toString(),
    },
  });

  const filesMap = new Map<FileId, BinaryFileData>();
  for (const element of elements) {
    if (isInitializedImageElement(element) && files[element.fileId]) {
      filesMap.set(element.fileId, files[element.fileId]);
    }
  }

  if (filesMap.size) {
    const filesToUpload = await encodeFilesForUpload({
      files: filesMap,
      encryptionKey,
      maxBytes: FILE_UPLOAD_MAX_BYTES,
    });

    await saveFilesToFirebase({
      prefix: `/migrations/files/scenes/${id}`,
      files: filesToUpload,
    });
  }

  window.open(
    `${import.meta.env.VITE_APP_PLUS_APP
    }/import?drawink=${id},${encryptionKey}`,
  );
};

export const ExportToDrawinkPlus: React.FC<{
  elements: readonly NonDeletedDrawinkElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  name: string;
  onError: (error: Error) => void;
  onSuccess: () => void;
}> = ({ elements, appState, files, name, onError, onSuccess }) => {
  const { t } = useI18n();
  const { isAuthenticated, openAuthDialog } = useAuth();
  const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);

  // Not logged in - show sign in prompt
  if (!isAuthenticated) {
    return (
      <Card color="primary">
        <div className="Card-icon">
          <DrawinkLogo
            style={{
              [`--color-logo-icon` as any]: "#fff",
              width: "2.8rem",
              height: "2.8rem",
            }}
          />
        </div>
        <h2>Drawink Pro</h2>
        <div className="Card-details">
          Sign in to save your boards to the cloud and access them from anywhere.
        </div>
        <ToolButton
          className="Card-button"
          type="button"
          title="Sign in"
          aria-label="Sign in"
          showAriaLabel={true}
          onClick={() => {
            openAuthDialog();
          }}
        />
      </Card>
    );
  }

  // Logged in - show workspace save button
  return (
    <Card color="primary">
      <div className="Card-icon">
        <DrawinkLogo
          style={{
            [`--color-logo-icon` as any]: "#fff",
            width: "2.8rem",
            height: "2.8rem",
          }}
        />
      </div>
      <h2>Drawink Pro</h2>
      <div className="Card-details">
        Save this board to your cloud workspace for easy access across devices.
      </div>
      <ToolButton
        className="Card-button"
        type="button"
        title="Save to Workspace"
        aria-label="Save to Workspace"
        showAriaLabel={true}
        onClick={() => setIsWorkspaceDialogOpen(true)}
      />

      <WorkspaceSaveDialog
        isOpen={isWorkspaceDialogOpen}
        onClose={() => setIsWorkspaceDialogOpen(false)}
        defaultBoardName={name}
        onSuccess={onSuccess}
      />
    </Card>
  );
};
