import React, { useState, useEffect } from "react";

import { useWorkspace } from "../workspace";

import "./SyncDialog.scss";

// Icons
const CloudIcon = () => (
  <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export const SyncDialog: React.FC = () => {
  const {
    showSyncDialog,
    pendingSyncBoards,
    workspaces,
    loading,
    loadWorkspaces,
    createWorkspace,
    syncLocalBoardsToWorkspace,
    skipSync,
  } = useWorkspace();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("My Workspace");
  const [syncMode, setSyncMode] = useState<"new" | "existing">("new");

  useEffect(() => {
    if (showSyncDialog) {
      loadWorkspaces();
    }
  }, [showSyncDialog, loadWorkspaces]);

  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId]);

  if (!showSyncDialog || pendingSyncBoards.length === 0) {
    return null;
  }

  const handleSync = async () => {
    if (syncMode === "new") {
      const workspace = await createWorkspace(newWorkspaceName.trim() || "My Workspace");
      if (workspace) {
        await syncLocalBoardsToWorkspace(workspace.id);
      }
    } else if (selectedWorkspaceId) {
      await syncLocalBoardsToWorkspace(selectedWorkspaceId);
    }
  };

  return (
    <div className="sync-dialog-overlay" onClick={skipSync}>
      <div className="sync-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="sync-dialog__close" onClick={skipSync}>
          <CloseIcon />
        </button>

        <div className="sync-dialog__icon">
          <CloudIcon />
        </div>

        <h2>Sync Your Boards</h2>
        <p className="sync-dialog__description">
          We found <strong>{pendingSyncBoards.length}</strong> local board
          {pendingSyncBoards.length > 1 ? "s" : ""} on this device. Would you like to
          sync {pendingSyncBoards.length > 1 ? "them" : "it"} to your account?
        </p>

        <div className="sync-dialog__boards">
          {pendingSyncBoards.slice(0, 5).map((board) => (
            <div key={board.id} className="sync-dialog__board">
              📋 {board.name}
            </div>
          ))}
          {pendingSyncBoards.length > 5 && (
            <div className="sync-dialog__board sync-dialog__board--more">
              +{pendingSyncBoards.length - 5} more
            </div>
          )}
        </div>

        <div className="sync-dialog__options">
          <label className="sync-dialog__option">
            <input
              type="radio"
              name="syncMode"
              checked={syncMode === "new"}
              onChange={() => setSyncMode("new")}
            />
            <span>Create new workspace</span>
          </label>

          {syncMode === "new" && (
            <input
              type="text"
              className="sync-dialog__input"
              placeholder="Workspace name..."
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          )}

          {workspaces.length > 0 && (
            <>
              <label className="sync-dialog__option">
                <input
                  type="radio"
                  name="syncMode"
                  checked={syncMode === "existing"}
                  onChange={() => setSyncMode("existing")}
                />
                <span>Add to existing workspace</span>
              </label>

              {syncMode === "existing" && (
                <select
                  className="sync-dialog__select"
                  value={selectedWorkspaceId}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                >
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>

        <div className="sync-dialog__actions">
          <button className="sync-dialog__btn sync-dialog__btn--secondary" onClick={skipSync}>
            Skip for now
          </button>
          <button
            className="sync-dialog__btn sync-dialog__btn--primary"
            onClick={handleSync}
            disabled={loading || (syncMode === "new" && !newWorkspaceName.trim())}
          >
            {loading ? "Syncing..." : "Sync Boards"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncDialog;
