import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";

import { useAuth } from "../auth";
import { useWorkspace } from "../workspace";
import { profilePageOpenAtom } from "./profileAtom";

import "./ProfilePage.scss";

// Icons
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const WorkspaceIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
  </svg>
);

const BoardIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="currentColor"
    style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
  >
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </svg>
);

export const ProfilePage: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(profilePageOpenAtom);
  const { user, displayName, avatarUrl, signOut } = useAuth();
  const {
    workspaces,
    loading,
    error,
    loadWorkspaces,
    createWorkspace,
    renameWorkspace,
    removeWorkspace,
    createBoard,
    renameBoard,
    removeBoard,
    getBoardsForWorkspace,
    selectWorkspace,
  } = useWorkspace();

  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newBoardName, setNewBoardName] = useState<Record<string, string>>({});
  const [editingWorkspace, setEditingWorkspace] = useState<string | null>(null);
  const [editingBoard, setEditingBoard] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (isOpen && user) {
      loadWorkspaces();
    }
  }, [isOpen, user, loadWorkspaces]);

  if (!isOpen) return null;

  const handleClose = () => setIsOpen(false);

  const toggleWorkspace = (workspaceId: string) => {
    setExpandedWorkspaces((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(workspaceId)) {
        newSet.delete(workspaceId);
      } else {
        newSet.add(workspaceId);
      }
      return newSet;
    });
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    await createWorkspace(newWorkspaceName.trim());
    setNewWorkspaceName("");
  };

  const handleCreateBoard = async (workspaceId: string) => {
    const name = newBoardName[workspaceId]?.trim();
    if (!name) return;
    await createBoard(workspaceId, name);
    setNewBoardName((prev) => ({ ...prev, [workspaceId]: "" }));
  };

  const handleStartEdit = (type: "workspace" | "board", id: string, currentName: string) => {
    if (type === "workspace") {
      setEditingWorkspace(id);
      setEditingBoard(null);
    } else {
      setEditingBoard(id);
      setEditingWorkspace(null);
    }
    setEditValue(currentName);
  };

  const handleSaveEdit = async (type: "workspace" | "board", id: string, workspaceId?: string) => {
    if (!editValue.trim()) return;

    if (type === "workspace") {
      await renameWorkspace(id, editValue.trim());
      setEditingWorkspace(null);
    } else if (workspaceId) {
      await renameBoard(id, workspaceId, editValue.trim());
      setEditingBoard(null);
    }
    setEditValue("");
  };

  const handleDeleteWorkspace = async (workspaceId: string, workspaceName: string) => {
    if (window.confirm(`Delete workspace "${workspaceName}" and all its boards?`)) {
      await removeWorkspace(workspaceId);
    }
  };

  const handleDeleteBoard = async (boardId: string, workspaceId: string, boardName: string) => {
    if (window.confirm(`Delete board "${boardName}"?`)) {
      await removeBoard(boardId, workspaceId);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    handleClose();
  };

  return (
    <div className="profile-page-overlay" onClick={handleClose}>
      <div className="profile-page" onClick={(e) => e.stopPropagation()}>
        <button className="profile-page__close" onClick={handleClose}>
          <CloseIcon />
        </button>

        <div className="profile-page__header">
          {avatarUrl && (
            <img src={avatarUrl} alt="Avatar" className="profile-page__avatar" />
          )}
          <div className="profile-page__user-info">
            <h2>{displayName || "User"}</h2>
            <p>{user?.email}</p>
          </div>
          <button className="profile-page__signout" onClick={handleSignOut}>
            Sign out
          </button>
        </div>

        {error && <div className="profile-page__error">{error}</div>}

        <div className="profile-page__content">
          <div className="profile-page__section">
            <div className="profile-page__section-header">
              <h3>
                <WorkspaceIcon /> Workspaces
              </h3>
            </div>

            <div className="profile-page__create-form">
              <input
                type="text"
                placeholder="New workspace name..."
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") handleCreateWorkspace();
                }}
              />
              <button onClick={handleCreateWorkspace} disabled={!newWorkspaceName.trim() || loading}>
                <PlusIcon /> Create
              </button>
            </div>

            {loading && workspaces.length === 0 && (
              <div className="profile-page__loading">Loading workspaces...</div>
            )}

            <div className="profile-page__workspaces">
              {workspaces.map((workspace) => {
                const isExpanded = expandedWorkspaces.has(workspace.id);
                const boards = getBoardsForWorkspace(workspace.id);
                const isEditing = editingWorkspace === workspace.id;

                return (
                  <div key={workspace.id} className="profile-page__workspace">
                    <div className="profile-page__workspace-header">
                      <button
                        className="profile-page__workspace-toggle"
                        onClick={() => toggleWorkspace(workspace.id)}
                      >
                        <ChevronIcon expanded={isExpanded} />
                      </button>

                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") handleSaveEdit("workspace", workspace.id);
                            if (e.key === "Escape") setEditingWorkspace(null);
                          }}
                          onBlur={() => handleSaveEdit("workspace", workspace.id)}
                          autoFocus
                          className="profile-page__edit-input"
                        />
                      ) : (
                        <span className="profile-page__workspace-name" onClick={() => toggleWorkspace(workspace.id)}>
                          {workspace.name}
                        </span>
                      )}

                      <span className="profile-page__workspace-count">
                        {boards.length} board{boards.length !== 1 ? "s" : ""}
                      </span>

                      <div className="profile-page__workspace-actions">
                        <button
                          className={isEditing ? "hidden" : "profile-page__workspace-select"}
                          onClick={async (e) => {
                            e.stopPropagation();
                            await selectWorkspace(workspace.id);
                            // Note: Page may reload for cloud workspaces with boards
                            // For empty workspaces or local workspace, close dialog
                            handleClose();
                          }}
                        >
                          Select
                        </button>
                        <button
                          title="Rename"
                          onClick={() => handleStartEdit("workspace", workspace.id, workspace.name)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => handleDeleteWorkspace(workspace.id, workspace.name)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="profile-page__boards">
                        <div className="profile-page__create-form profile-page__create-form--small">
                          <input
                            type="text"
                            placeholder="New board name..."
                            value={newBoardName[workspace.id] || ""}
                            onChange={(e) =>
                              setNewBoardName((prev) => ({
                                ...prev,
                                [workspace.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") handleCreateBoard(workspace.id);
                            }}
                          />
                          <button
                            onClick={() => handleCreateBoard(workspace.id)}
                            disabled={!newBoardName[workspace.id]?.trim() || loading}
                          >
                            <PlusIcon />
                          </button>
                        </div>

                        {boards.length === 0 && (
                          <div className="profile-page__empty">No boards yet</div>
                        )}

                        {boards.map((board) => {
                          const isBoardEditing = editingBoard === board.id;

                          return (
                            <div key={board.id} className="profile-page__board">
                              <BoardIcon />

                              {isBoardEditing ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === "Enter") handleSaveEdit("board", board.id, workspace.id);
                                    if (e.key === "Escape") setEditingBoard(null);
                                  }}
                                  onBlur={() => handleSaveEdit("board", board.id, workspace.id)}
                                  autoFocus
                                  className="profile-page__edit-input"
                                />
                              ) : (
                                <span className="profile-page__board-name">{board.name}</span>
                              )}

                              <div className="profile-page__board-actions">
                                <button
                                  title="Rename"
                                  onClick={() => handleStartEdit("board", board.id, board.name)}
                                >
                                  <EditIcon />
                                </button>
                                <button
                                  title="Delete"
                                  onClick={() => handleDeleteBoard(board.id, workspace.id, board.name)}
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {workspaces.length === 0 && !loading && (
                <div className="profile-page__empty">
                  No workspaces yet. Create one to get started!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
