import React, { useEffect, useState, useCallback } from "react";
import { useWorkspace, LOCAL_WORKSPACE_ID } from "../workspace";
import { TrashIcon, FreedrawIcon, checkIcon, PlusIcon } from "@drawink/drawink/components/icons";
import { t } from "@drawink/drawink/i18n";
import Spinner from "@drawink/drawink/components/Spinner";

import "./BoardsMenu.scss";

/**
 * BoardsMenu component that uses useWorkspace directly.
 * Shows boards for the active workspace without needing BoardsAPI interface.
 */
export const BoardsMenu = () => {
  const {
    currentWorkspace,
    workspaceBoards,
    createBoard,
    renameBoard,
    removeBoard,
    switchBoard,
    loadWorkspaces,
  } = useWorkspace();

  const [currentBoardId, setCurrentBoardId] = useState<string | null>(
    localStorage.getItem("drawink-currentBoardId")
  );
  const [loading, setLoading] = useState(true);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [newBoardName, setNewBoardName] = useState("");

  // Get boards for current workspace
  const boards = currentWorkspace
    ? workspaceBoards.get(currentWorkspace.id) || []
    : [];

  // Load workspaces on mount
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadWorkspaces();
      setLoading(false);
    };
    init();
  }, [loadWorkspaces]);

  // Auto-create default board if workspace is empty
  useEffect(() => {
    const autoCreateBoard = async () => {
      if (!currentWorkspace || loading) return;
      if (boards.length === 0) {
        await createBoard(currentWorkspace.id, "Default Board");
      }
    };
    autoCreateBoard();
  }, [currentWorkspace, boards.length, loading, createBoard]);

  // Auto-select first board if none selected
  useEffect(() => {
    if (boards.length > 0 && !currentBoardId) {
      const firstBoardId = boards[0].id;
      setCurrentBoardId(firstBoardId);
      localStorage.setItem("drawink-currentBoardId", firstBoardId);
    }
  }, [boards, currentBoardId]);

  const handleCreateBoard = useCallback(async () => {
    if (!currentWorkspace) return;
    const name = `Untitled Board ${boards.length + 1}`;
    await createBoard(currentWorkspace.id, name);
  }, [currentWorkspace, boards.length, createBoard]);

  const handleSwitchBoard = useCallback(async (id: string) => {
    if (!currentWorkspace || id === currentBoardId) return;
    await switchBoard(id, currentWorkspace.id);
    setCurrentBoardId(id);
    localStorage.setItem("drawink-currentBoardId", id);
    window.location.reload();
  }, [currentWorkspace, currentBoardId, switchBoard]);

  const handleDeleteBoard = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!currentWorkspace) return;
    if (window.confirm(t("alerts.deleteBoard"))) {
      await removeBoard(id, currentWorkspace.id);
      // If we deleted the current board, switch to first remaining one
      if (id === currentBoardId && boards.length > 1) {
        const nextBoard = boards.find(b => b.id !== id);
        if (nextBoard) {
          handleSwitchBoard(nextBoard.id);
        }
      }
    }
  }, [currentWorkspace, currentBoardId, boards, removeBoard, handleSwitchBoard]);

  const startEditing = (e: React.MouseEvent, board: { id: string; name: string }) => {
    e.stopPropagation();
    setEditingBoardId(board.id);
    setNewBoardName(board.name);
  };

  const saveBoardName = useCallback(async (e: React.MouseEvent | React.FormEvent, id: string) => {
    e.stopPropagation();
    if (!currentWorkspace) return;
    await renameBoard(id, currentWorkspace.id, newBoardName);
    setEditingBoardId(null);
  }, [currentWorkspace, newBoardName, renameBoard]);

  if (loading && boards.length === 0) {
    return (
      <div className="boards-menu-loading">
        <Spinner />
      </div>
    );
  }

  if (!currentWorkspace) {
    return <div className="boards-menu-error">No workspace selected</div>;
  }

  return (
    <div className="boards-menu">
      <div className="boards-menu-header">
        <button className="boards-menu-create-btn" onClick={handleCreateBoard}>
          {PlusIcon} {t("buttons.createBoard")}
        </button>
      </div>
      <ul className="boards-menu-list">
        {boards.map((board) => (
          <li
            key={board.id}
            className={`boards-menu-item ${board.id === currentBoardId ? "active" : ""}`}
            onClick={() => handleSwitchBoard(board.id)}
          >
            {editingBoardId === board.id ? (
              <div className="boards-menu-item-edit" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveBoardName(e, board.id);
                    if (e.key === "Escape") setEditingBoardId(null);
                  }}
                />
                <button onClick={(e) => saveBoardName(e, board.id)}>{checkIcon}</button>
              </div>
            ) : (
              <>
                <span className="boards-menu-item-name">{board.name}</span>
                <div className="boards-menu-item-actions">
                  <button onClick={(e) => startEditing(e, board)}>{FreedrawIcon}</button>
                  {boards.length > 1 && (
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDeleteBoard(e, board.id)}
                    >
                      {TrashIcon}
                    </button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
