import React, { useEffect, useState } from "react";
import { uploadBytes, ref } from "firebase/storage";
import { nanoid } from "nanoid";

import { trackEvent } from "@drawink/drawink/analytics";
import { Card } from "@drawink/drawink/components/Card";
import { DrawinkLogo } from "@drawink/drawink/components/DrawinkLogo";
import { ToolButton } from "@drawink/drawink/components/ToolButton";
import { MIME_TYPES, getFrame } from "@drawink/common";
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
import { useWorkspace } from "../workspace";

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
  const {
    workspaces,
    loading,
    loadWorkspaces,
    createWorkspace,
    createBoard,
    getBoardsForWorkspace,
  } = useWorkspace();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [boardName, setBoardName] = useState(name || "Untitled Board");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadWorkspaces();
    }
  }, [isAuthenticated, loadWorkspaces]);

  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId]);

  const handleSaveToWorkspace = async () => {
    if (!selectedWorkspaceId || !boardName.trim()) return;

    setSaving(true);
    try {
      await createBoard(selectedWorkspaceId, boardName.trim());
      setSaved(true);
      trackEvent("export", "workspace", `ui (${getFrame()})`);

      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (error: any) {
      console.error("Failed to save to workspace:", error);
      onError(new Error("Failed to save to workspace"));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewWorkspace = async () => {
    const workspaceName = window.prompt("Enter workspace name:");
    if (workspaceName?.trim()) {
      const workspace = await createWorkspace(workspaceName.trim());
      if (workspace) {
        setSelectedWorkspaceId(workspace.id);
      }
    }
  };

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

  // Logged in - show workspace save form
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
      <div className="Card-details export-workspace-form">
        <div className="export-workspace-row">
          <label>Workspace</label>
          <div className="export-workspace-select-row">
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              disabled={loading || saving}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {workspaces.length === 0 && (
                <option value="">No workspaces</option>
              )}
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name} ({getBoardsForWorkspace(workspace.id).length})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="export-workspace-new-btn"
              onClick={handleCreateNewWorkspace}
              disabled={loading || saving}
            >
              + New
            </button>
          </div>
        </div>

        <div className="export-workspace-row">
          <label>Board Name</label>
          <input
            type="text"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            placeholder="Enter board name..."
            onKeyDown={(e) => e.stopPropagation()}
            disabled={saving}
          />
        </div>
      </div>
      <ToolButton
        className="Card-button"
        type="button"
        title={saved ? "✓ Saved!" : saving ? "Saving..." : "Save to Workspace"}
        aria-label={saved ? "Saved" : saving ? "Saving" : "Save to Workspace"}
        showAriaLabel={true}
        onClick={handleSaveToWorkspace}
      />
    </Card>
  );
};
