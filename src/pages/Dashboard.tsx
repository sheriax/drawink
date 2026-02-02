/**
 * Dashboard Page
 * Left sidebar for workspace management + main area for board grid.
 */

import {
  useUser,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
} from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { hybridStorageAdapter } from "@/data/HybridStorageAdapter";
import { SyncStatusBanner } from "@/components/SyncStatusBanner";
import "./Dashboard.scss";

export const Dashboard: React.FC = () => {
  return (
    <>
      <SignedIn>
        <DashboardContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

const WORKSPACE_COLORS = [
  "#6965db",
  "#e53935",
  "#fb8c00",
  "#43a047",
  "#1e88e5",
  "#8e24aa",
  "#00897b",
  "#546e7a",
];

const WORKSPACE_ICONS = [
  "📁", "🏠", "💼", "🎨", "🚀", "⚡",
  "🔬", "📐", "🎯", "💡", "🌟", "🔧",
];

type ContextMenu = {
  workspaceId: Id<"workspaces">;
  x: number;
  y: number;
} | null;

type BoardContextMenu = {
  boardId: Id<"boards">;
  boardName: string;
  x: number;
  y: number;
} | null;

const DashboardContent: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [selectedWorkspaceId, setSelectedWorkspaceId] =
    useState<Id<"workspaces"> | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [renamingId, setRenamingId] = useState<Id<"workspaces"> | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: Id<"workspaces">;
    name: string;
  } | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [pickerFor, setPickerFor] = useState<{
    id: Id<"workspaces">;
    type: "icon" | "color";
  } | null>(null);

  // Board management state
  const [boardContextMenu, setBoardContextMenu] = useState<BoardContextMenu>(null);
  const [renamingBoardId, setRenamingBoardId] = useState<Id<"boards"> | null>(null);
  const [boardRenameValue, setBoardRenameValue] = useState("");
  const [deleteBoardConfirm, setDeleteBoardConfirm] = useState<{
    id: Id<"boards">;
    name: string;
  } | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const boardContextMenuRef = useRef<HTMLDivElement>(null);

  const workspaces = useQuery(api.workspaces.listMine);
  const recentBoards = useQuery(
    api.boards.listByWorkspace,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip",
  );

  const createBoard = useMutation(api.boards.create);
  const ensureDefaultWorkspace = useMutation(api.workspaces.ensureDefault);
  const createWorkspaceMut = useMutation(api.workspaces.create);
  const updateWorkspace = useMutation(api.workspaces.update);
  const deleteWorkspaceMut = useMutation(api.workspaces.deleteWorkspace);
  const updateBoard = useMutation(api.boards.update);
  const deleteBoard = useMutation(api.boards.permanentDelete);

  useEffect(() => {
    const saved = localStorage.getItem("selectedWorkspaceId");
    if (saved) {
      setSelectedWorkspaceId(saved as Id<"workspaces">);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!selectedWorkspaceId && workspaces && workspaces.length > 0) {
      selectWorkspace(workspaces[0]._id);
    }
    if (workspaces && workspaces.length === 0) {
      ensureDefaultWorkspace({}).then((id) => selectWorkspace(id));
    }
  }, [user, workspaces, selectedWorkspaceId, ensureDefaultWorkspace]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu && !boardContextMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        contextMenu &&
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
      if (
        boardContextMenu &&
        boardContextMenuRef.current &&
        !boardContextMenuRef.current.contains(e.target as Node)
      ) {
        setBoardContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu, boardContextMenu]);

  const selectWorkspace = (id: Id<"workspaces">) => {
    setSelectedWorkspaceId(id);
    localStorage.setItem("selectedWorkspaceId", id);
  };

  const handleCreateWorkspace = async () => {
    const name = newWorkspaceName.trim();
    if (!name) return;
    try {
      const id = await createWorkspaceMut({ name });
      setCreatingWorkspace(false);
      setNewWorkspaceName("");
      selectWorkspace(id);
    } catch (error) {
      console.error("Failed to create workspace:", error);
    }
  };

  const handleRename = async (id: Id<"workspaces">) => {
    const name = renameValue.trim();
    if (!name) {
      setRenamingId(null);
      return;
    }
    try {
      await updateWorkspace({ workspaceId: id, name });
    } catch (error) {
      console.error("Failed to rename workspace:", error);
    }
    setRenamingId(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      // Get boards in this workspace to delete locally
      const boardsToDelete = recentBoards || [];
      
      await deleteWorkspaceMut({
        workspaceId: deleteConfirm.id,
        confirmName: deleteInput,
      });
      
      // Also delete all local board data for this workspace to prevent re-sync
      for (const board of boardsToDelete) {
        await hybridStorageAdapter.deleteBoard(board._id);
      }
      
      if (selectedWorkspaceId === deleteConfirm.id) {
        localStorage.removeItem("selectedWorkspaceId");
        setSelectedWorkspaceId(null);
      }
    } catch (error) {
      console.error("Failed to delete workspace:", error);
    }
    setDeleteConfirm(null);
    setDeleteInput("");
  };

  const handleCreateBoard = async () => {
    if (!selectedWorkspaceId) return;
    try {
      const boardId = await createBoard({
        workspaceId: selectedWorkspaceId,
        name: "Untitled Board",
      });
      navigate(`/#${boardId}`);
    } catch (error) {
      console.error("Failed to create board:", error);
    }
  };

  const handleBoardRename = async (id: Id<"boards">) => {
    const name = boardRenameValue.trim();
    if (!name) {
      setRenamingBoardId(null);
      return;
    }
    try {
      await updateBoard({ boardId: id, name });
    } catch (error) {
      console.error("Failed to rename board:", error);
    }
    setRenamingBoardId(null);
  };

  const handleBoardDelete = async () => {
    if (!deleteBoardConfirm) return;
    try {
      // Delete from cloud (Convex)
      await deleteBoard({ boardId: deleteBoardConfirm.id });
      // Also delete from local storage to prevent re-sync
      await hybridStorageAdapter.deleteBoard(deleteBoardConfirm.id);
    } catch (error) {
      console.error("Failed to delete board:", error);
    }
    setDeleteBoardConfirm(null);
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  const selectedWorkspace = workspaces?.find(
    (ws) => ws._id === selectedWorkspaceId,
  );
  const isLoadingBoards =
    recentBoards === undefined || workspaces === undefined;

  return (
    <div className="drawink-dashboard">
      <SyncStatusBanner />
      {/* Nav bar */}
      <header className="drawink-dashboard__nav">
        <button
          className="drawink-dashboard__back-btn"
          onClick={() => navigate("/")}
          title="Back to canvas"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="drawink-dashboard__logo">Drawink</span>
        <div className="drawink-dashboard__nav-right">
          <span className="drawink-dashboard__greeting">
            {user?.firstName || user?.username || ""}
          </span>
          {user?.imageUrl && (
            <img src={user.imageUrl} alt="" className="drawink-dashboard__avatar" />
          )}
        </div>
      </header>

      <div className="drawink-dashboard__body">
        {/* ── Workspace sidebar ── */}
        <aside className="drawink-dashboard__sidebar">
          <div className="drawink-dashboard__sidebar-header">
            <span className="drawink-dashboard__sidebar-title">Workspaces</span>
            <button
              className="drawink-dashboard__sidebar-add"
              onClick={() => {
                setCreatingWorkspace(true);
                setNewWorkspaceName("");
              }}
              title="Create workspace"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {creatingWorkspace && (
            <div className="drawink-dashboard__ws-create">
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Workspace name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateWorkspace();
                  if (e.key === "Escape") setCreatingWorkspace(false);
                }}
                onBlur={() => {
                  if (!newWorkspaceName.trim()) setCreatingWorkspace(false);
                }}
              />
            </div>
          )}

          <div className="drawink-dashboard__ws-list">
            {workspaces === undefined ? (
              <div className="drawink-dashboard__ws-loading">
                <div className="drawink-dashboard__spinner" />
              </div>
            ) : (
              workspaces.map((ws) => (
                <div
                  key={ws._id}
                  className={`drawink-dashboard__ws-item${
                    ws._id === selectedWorkspaceId ? " drawink-dashboard__ws-item--active" : ""
                  }`}
                  onClick={() => selectWorkspace(ws._id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (ws.ownerId === user?.id) {
                      setContextMenu({ workspaceId: ws._id, x: e.clientX, y: e.clientY });
                    }
                  }}
                >
                  {renamingId === ws._id ? (
                    <input
                      className="drawink-dashboard__ws-rename-input"
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(ws._id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={() => handleRename(ws._id)}
                    />
                  ) : (
                    <>
                      <span
                        className="drawink-dashboard__ws-dot"
                        style={{ background: ws.color || "#6965db" }}
                      >
                        {ws.icon || ""}
                      </span>
                      <span className="drawink-dashboard__ws-name">{ws.name}</span>
                      {ws.ownerId === user?.id && (
                        <button
                          className="drawink-dashboard__ws-menu-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({ workspaceId: ws._id, x: e.clientX, y: e.clientY });
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Context menu */}
        {contextMenu && (
          <div
            ref={contextMenuRef}
            className="drawink-dashboard__ctx-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button onClick={() => {
              const ws = workspaces?.find((w) => w._id === contextMenu.workspaceId);
              if (ws) { setRenamingId(ws._id); setRenameValue(ws.name); }
              setContextMenu(null);
            }}>
              Rename
            </button>
            <button onClick={() => {
              setPickerFor({ id: contextMenu.workspaceId, type: "icon" });
              setContextMenu(null);
            }}>
              Change Icon
            </button>
            <button onClick={() => {
              setPickerFor({ id: contextMenu.workspaceId, type: "color" });
              setContextMenu(null);
            }}>
              Change Color
            </button>
            <div className="drawink-dashboard__ctx-divider" />
            <button
              className="drawink-dashboard__ctx-danger"
              onClick={() => {
                const ws = workspaces?.find((w) => w._id === contextMenu.workspaceId);
                if (ws) setDeleteConfirm({ id: ws._id, name: ws.name });
                setContextMenu(null);
              }}
            >
              Delete Workspace
            </button>
          </div>
        )}

        {/* Icon/Color picker */}
        {pickerFor && (
          <div className="drawink-dashboard__picker-overlay" onClick={() => setPickerFor(null)}>
            <div className="drawink-dashboard__picker" onClick={(e) => e.stopPropagation()}>
              <h3>{pickerFor.type === "icon" ? "Choose Icon" : "Choose Color"}</h3>
              <div className="drawink-dashboard__picker-grid">
                {pickerFor.type === "icon"
                  ? WORKSPACE_ICONS.map((icon) => (
                      <button
                        key={icon}
                        className="drawink-dashboard__picker-item"
                        onClick={() => {
                          updateWorkspace({ workspaceId: pickerFor.id, icon });
                          setPickerFor(null);
                        }}
                      >
                        {icon}
                      </button>
                    ))
                  : WORKSPACE_COLORS.map((color) => (
                      <button
                        key={color}
                        className="drawink-dashboard__picker-item drawink-dashboard__picker-color"
                        style={{ background: color }}
                        onClick={() => {
                          updateWorkspace({ workspaceId: pickerFor.id, color });
                          setPickerFor(null);
                        }}
                      />
                    ))}
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {deleteConfirm && (
          <div className="drawink-dashboard__modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="drawink-dashboard__modal" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Workspace</h3>
              <p>
                This will permanently delete <strong>{deleteConfirm.name}</strong> and all its boards. This cannot be undone.
              </p>
              <p>Type <strong>{deleteConfirm.name}</strong> to confirm:</p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={deleteConfirm.name}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && deleteInput === deleteConfirm.name) handleDelete();
                }}
              />
              <div className="drawink-dashboard__modal-actions">
                <button className="drawink-dashboard__modal-cancel" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button
                  className="drawink-dashboard__modal-delete"
                  disabled={deleteInput !== deleteConfirm.name}
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Main content: boards ── */}
        <main className="drawink-dashboard__main">
          <div className="drawink-dashboard__toolbar">
            <h1 className="drawink-dashboard__title">
              {selectedWorkspace?.icon && (
                <span className="drawink-dashboard__title-icon">{selectedWorkspace.icon}</span>
              )}
              {selectedWorkspace?.name || "Boards"}
            </h1>
            <button className="drawink-dashboard__create-btn" onClick={handleCreateBoard}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Board
            </button>
          </div>

          {isLoadingBoards ? (
            <div className="drawink-dashboard__loading">
              <div className="drawink-dashboard__spinner" />
              <span>Loading boards...</span>
            </div>
          ) : !recentBoards || recentBoards.length === 0 ? (
            <div className="drawink-dashboard__empty">
              <div className="drawink-dashboard__empty-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <h2>No boards yet</h2>
              <p>Create your first board to start drawing</p>
              <button className="drawink-dashboard__create-btn" onClick={handleCreateBoard}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Create Board
              </button>
            </div>
          ) : (
            <>
              <div className="drawink-dashboard__grid">
                <button
                  className="drawink-dashboard__card drawink-dashboard__card--new"
                  onClick={handleCreateBoard}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span>New Board</span>
                </button>

                {recentBoards.map((board) => (
                  <div
                    key={board._id}
                    className="drawink-dashboard__card"
                    onClick={() => {
                      if (renamingBoardId !== board._id) {
                        navigate(`/#${board._id}`);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setBoardContextMenu({
                        boardId: board._id,
                        boardName: board.name,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                  >
                    <div className="drawink-dashboard__card-thumb">
                      {board.thumbnailUrl ? (
                        <img src={board.thumbnailUrl} alt={board.name} />
                      ) : (
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M3 9h18M9 21V9" />
                        </svg>
                      )}
                    </div>
                    <button
                      className="drawink-dashboard__card-menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBoardContextMenu({
                          boardId: board._id,
                          boardName: board.name,
                          x: e.clientX,
                          y: e.clientY,
                        });
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                    <div className="drawink-dashboard__card-info">
                      {renamingBoardId === board._id ? (
                        <input
                          className="drawink-dashboard__board-rename-input"
                          type="text"
                          value={boardRenameValue}
                          onChange={(e) => setBoardRenameValue(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleBoardRename(board._id);
                            if (e.key === "Escape") setRenamingBoardId(null);
                          }}
                          onBlur={() => handleBoardRename(board._id)}
                        />
                      ) : (
                        <span className="drawink-dashboard__card-name">{board.name}</span>
                      )}
                      <span className="drawink-dashboard__card-date">{formatDate(board._creationTime)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Board context menu */}
              {boardContextMenu && (
                <div
                  ref={boardContextMenuRef}
                  className="drawink-dashboard__ctx-menu"
                  style={{ top: boardContextMenu.y, left: boardContextMenu.x }}
                >
                  <button onClick={() => {
                    setRenamingBoardId(boardContextMenu.boardId);
                    setBoardRenameValue(boardContextMenu.boardName);
                    setBoardContextMenu(null);
                  }}>
                    Rename
                  </button>
                  <div className="drawink-dashboard__ctx-divider" />
                  {recentBoards && recentBoards.length > 1 ? (
                    <button
                      className="drawink-dashboard__ctx-danger"
                      onClick={() => {
                        setDeleteBoardConfirm({
                          id: boardContextMenu.boardId,
                          name: boardContextMenu.boardName,
                        });
                        setBoardContextMenu(null);
                      }}
                    >
                      Delete Board
                    </button>
                  ) : (
                    <button
                      className="drawink-dashboard__ctx-disabled"
                      title="Cannot delete the last board"
                      onClick={(e) => e.preventDefault()}
                    >
                      Delete Board
                    </button>
                  )}
                </div>
              )}

              {/* Board delete confirmation modal */}
              {deleteBoardConfirm && (
                <div className="drawink-dashboard__modal-overlay" onClick={() => setDeleteBoardConfirm(null)}>
                  <div className="drawink-dashboard__modal" onClick={(e) => e.stopPropagation()}>
                    <h3>Delete Board</h3>
                    <p>
                      Are you sure you want to delete <strong>{deleteBoardConfirm.name}</strong>? This cannot be undone.
                    </p>
                    <div className="drawink-dashboard__modal-actions">
                      <button className="drawink-dashboard__modal-cancel" onClick={() => setDeleteBoardConfirm(null)}>
                        Cancel
                      </button>
                      <button
                        className="drawink-dashboard__modal-delete"
                        onClick={handleBoardDelete}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
