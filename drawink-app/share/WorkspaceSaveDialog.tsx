import React, { useEffect, useState } from "react";
import { Dialog } from "@drawink/drawink/components/Dialog";
import { FilledButton } from "@drawink/drawink/components/FilledButton";
import { trackEvent } from "@drawink/drawink/analytics";
import { useWorkspace } from "../workspace";
import { useI18n } from "@drawink/drawink/i18n";
import { getFrame } from "@drawink/common";

import "./WorkspaceSaveDialog.scss";

type WorkspaceSaveDialogProps = {
  onClose: () => void;
  isOpen: boolean;
  defaultBoardName?: string;
  onSuccess?: () => void;
};

// Cloud save icon
const cloudSaveIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" />
  </svg>
);

export const WorkspaceSaveDialog = ({
  onClose,
  isOpen,
  defaultBoardName = "Untitled Board",
  onSuccess,
}: WorkspaceSaveDialogProps) => {
  const { t } = useI18n();
  const {
    workspaces,
    loading,
    loadWorkspaces,
    createWorkspace,
    createBoard,
    getBoardsForWorkspace,
  } = useWorkspace();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [boardName, setBoardName] = useState(defaultBoardName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadWorkspaces();
      setBoardName(defaultBoardName);
      setSaved(false);
    }
  }, [isOpen, loadWorkspaces, defaultBoardName]);

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
      trackEvent("share", "saved to workspace", `ui (${getFrame()})`);

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
        setSaving(false); // Reset for next time
        setSaved(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to save to workspace:", error);
      setSaving(false);
    }
  };

  const handleCreateNewWorkspace = async () => {
    const name = window.prompt("Enter workspace name:");
    if (name?.trim()) {
      const workspace = await createWorkspace(name.trim());
      if (workspace) {
        setSelectedWorkspaceId(workspace.id);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog size="small" onCloseRequest={onClose} title={false}>
      <div className="WorkspaceSaveDialog">
        <div className="WorkspaceSaveDialog__header">
          ☁️ Save to Workspace
        </div>
        <div className="WorkspaceSaveDialog__description">
          Save this board to your cloud workspace for easy access across devices.
        </div>

        <div className="WorkspaceSaveDialog__form">
          <div className="WorkspaceSaveDialog__row">
            <label>Workspace</label>
            <div className="WorkspaceSaveDialog__select-row">
              <select
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                disabled={loading || saving}
              >
                {workspaces.length === 0 && (
                  <option value="">No workspaces</option>
                )}
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} ({getBoardsForWorkspace(workspace.id).length} boards)
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="WorkspaceSaveDialog__new-btn"
                onClick={handleCreateNewWorkspace}
                disabled={loading || saving}
              >
                + New
              </button>
            </div>
          </div>

          <div className="WorkspaceSaveDialog__row">
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

        <div className="WorkspaceSaveDialog__footer">
          <button
            className="WorkspaceSaveDialog__save-btn"
            onClick={handleSaveToWorkspace}
            disabled={saving || saved || !selectedWorkspaceId || !boardName.trim()}
          >
            {cloudSaveIcon}
            {saved ? "✓ Saved!" : saving ? "Saving..." : "Save to Workspace"}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
