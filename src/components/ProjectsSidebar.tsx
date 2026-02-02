/**
 * Projects Sidebar
 * Workspace dropdown + flat board list (local-first, synced to Convex).
 * This is the single place to manage boards — replaces the old BoardsMenu.
 */

import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "@/core/editor-jotai";
import {
  boardsAtom,
  currentBoardIdAtom,
  isLoadingBoardsAtom,
  editingBoardIdAtom,
  createBoardAtom,
  switchBoardAtom,
  updateBoardNameAtom,
  deleteBoardAtom,
  boardsAPIAtom,
  refreshBoardsAtom,
} from "@/core/atoms/boards";
import "./ProjectsSidebar.scss";

export const ProjectsSidebar: React.FC = () => {
  const { user, isLoaded } = useUser();

  // Local-first board state (jotai)
  const boards = useAtomValue(boardsAtom);
  const currentBoardId = useAtomValue(currentBoardIdAtom);
  const isLoading = useAtomValue(isLoadingBoardsAtom);
  const boardsAPI = useAtomValue(boardsAPIAtom);
  const [editingBoardId, setEditingBoardId] = useAtom(editingBoardIdAtom);
  const [newBoardName, setNewBoardName] = useState("");

  const refreshBoards = useSetAtom(refreshBoardsAtom);
  const createBoard = useSetAtom(createBoardAtom);
  const switchBoard = useSetAtom(switchBoardAtom);
  const updateBoardName = useSetAtom(updateBoardNameAtom);
  const deleteBoard = useSetAtom(deleteBoardAtom);

  // Refresh boards on mount
  useEffect(() => {
    if (boardsAPI) {
      refreshBoards();
    }
  }, [boardsAPI, refreshBoards]);

  const handleCreateBoard = async () => {
    const name = `Untitled Board ${boards.length + 1}`;
    await createBoard(name);
  };

  const handleSwitchBoard = async (id: string) => {
    if (id === currentBoardId) return;
    await switchBoard(id);
    refreshBoards();
  };

  const handleDeleteBoard = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this board? This cannot be undone.")) {
      await deleteBoard(id);
    }
  };

  const startEditing = (e: React.MouseEvent, board: { id: string; name: string }) => {
    e.stopPropagation();
    setEditingBoardId(board.id);
    setNewBoardName(board.name);
  };

  const saveBoardName = async (e: React.MouseEvent | React.FormEvent, id: string) => {
    e.stopPropagation();
    if (newBoardName.trim()) {
      await updateBoardName({ id, name: newBoardName.trim() });
    } else {
      setEditingBoardId(null);
    }
  };

  if (!isLoaded || !user) {
    return (
      <div className="projects-sidebar">
        <div className="projects-sidebar__empty">
          <p>Sign in to see your boards</p>
        </div>
      </div>
    );
  }

  if (!boardsAPI) {
    return (
      <div className="projects-sidebar">
        <div className="projects-sidebar__loading">
          <div className="spinner-small" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="projects-sidebar">
      {/* Header with create button */}
      <div className="projects-sidebar__header">
        <h3>Boards</h3>
        <button
          onClick={handleCreateBoard}
          className="projects-sidebar__create-btn"
          title="Create new board"
        >
          +
        </button>
      </div>

      {/* Board list */}
      {isLoading && boards.length === 0 ? (
        <div className="projects-sidebar__loading">
          <div className="spinner-small" />
          <span>Loading boards...</span>
        </div>
      ) : boards.length === 0 ? (
        <div className="projects-sidebar__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No boards yet</p>
          <button onClick={handleCreateBoard} className="btn-small">
            Create Board
          </button>
        </div>
      ) : (
        <div className="projects-sidebar__list">
          {boards.map((board) => (
            <div
              key={board.id}
              className={`board-item ${board.id === currentBoardId ? "board-item--active" : ""}`}
              onClick={() => handleSwitchBoard(board.id)}
            >
              {editingBoardId === board.id ? (
                <div className="board-item__edit" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveBoardName(e, board.id);
                      if (e.key === "Escape") setEditingBoardId(null);
                    }}
                    onBlur={() => setEditingBoardId(null)}
                  />
                  <button
                    className="board-item__save-btn"
                    onMouseDown={(e) => saveBoardName(e, board.id)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <svg className="board-item__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="board-item__name">{board.name}</span>
                  <div className="board-item__actions">
                    <button
                      className="board-item__action-btn"
                      onClick={(e) => startEditing(e, board)}
                      title="Rename"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    {boards.length > 1 && (
                      <button
                        className="board-item__action-btn board-item__action-btn--delete"
                        onClick={(e) => handleDeleteBoard(e, board.id)}
                        title="Delete"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
