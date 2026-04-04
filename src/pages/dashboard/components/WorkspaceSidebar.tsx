import { useRef, useState, useEffect } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AiUsageMeter } from "./AiUsageMeter";
import { PickerModal } from "./PickerModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { WORKSPACE_COLORS, WORKSPACE_ICONS } from "../constants";
import { useIsTeamTier } from "@/hooks/useSubscription";
import { ProBadge } from "./ProBadge";
import { MembersModal } from "./MembersModal";

interface Workspace {
  _id: Id<"workspaces">;
  name: string;
  ownerId: string;
  icon?: string;
  color?: string;
  memberCount: number;
}

interface WorkspaceSidebarProps {
  workspaces: Workspace[] | undefined;
  selectedWorkspaceId: Id<"workspaces"> | null;
  userId: string | undefined;
  archivedCount: number;
  onSelectWorkspace: (id: Id<"workspaces">) => void;
  onShowArchive: () => void;
  showingArchive: boolean;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  workspaces,
  selectedWorkspaceId,
  userId,
  archivedCount,
  onSelectWorkspace,
  onShowArchive,
  showingArchive,
}) => {
  const isTeam = useIsTeamTier();
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    workspaceId: Id<"workspaces">;
    x: number;
    y: number;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<Id<"workspaces"> | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: Id<"workspaces">;
    name: string;
  } | null>(null);
  const [pickerFor, setPickerFor] = useState<{
    id: Id<"workspaces">;
    type: "icon" | "color";
  } | null>(null);
  const [membersModalFor, setMembersModalFor] = useState<{
    id: Id<"workspaces">;
    name: string;
  } | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const createWorkspaceMut = useMutation(api.workspaces.create);
  const updateWorkspace = useMutation(api.workspaces.update);
  const deleteWorkspaceMut = useMutation(api.workspaces.deleteWorkspace);
  const removeMemberMut = useMutation(api.workspaces.removeMember);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu]);

  const handleCreateWorkspace = async () => {
    const name = newWorkspaceName.trim();
    if (!name) return;
    try {
      const id = await createWorkspaceMut({ name });
      setCreatingWorkspace(false);
      setNewWorkspaceName("");
      onSelectWorkspace(id);
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
      await deleteWorkspaceMut({
        workspaceId: deleteConfirm.id,
        confirmName: deleteConfirm.name,
      });
      if (selectedWorkspaceId === deleteConfirm.id) {
        localStorage.removeItem("selectedWorkspaceId");
      }
    } catch (error) {
      console.error("Failed to delete workspace:", error);
    }
    setDeleteConfirm(null);
  };

  return (
    <>
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
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
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
            <>
              {/* Owned workspaces */}
              {workspaces.filter((ws) => ws.ownerId === userId).map((ws) => (
                <div
                  key={ws._id}
                  className={`drawink-dashboard__ws-item${
                    ws._id === selectedWorkspaceId && !showingArchive
                      ? " drawink-dashboard__ws-item--active"
                      : ""
                  }`}
                  onClick={() => onSelectWorkspace(ws._id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      workspaceId: ws._id,
                      x: e.clientX,
                      y: e.clientY,
                    });
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
                      {ws.memberCount > 1 && (
                        <span className="drawink-dashboard__ws-member-count">
                          {ws.memberCount}
                        </span>
                      )}
                      <button
                        className="drawink-dashboard__ws-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenu({
                            workspaceId: ws._id,
                            x: e.clientX,
                            y: e.clientY,
                          });
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              ))}

              {/* Shared workspaces */}
              {workspaces.filter((ws) => ws.ownerId !== userId).length > 0 && (
                <>
                  <div className="drawink-dashboard__ws-section-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Shared with me
                  </div>
                  {workspaces.filter((ws) => ws.ownerId !== userId).map((ws) => (
                    <div
                      key={ws._id}
                      className={`drawink-dashboard__ws-item drawink-dashboard__ws-item--shared${
                        ws._id === selectedWorkspaceId && !showingArchive
                          ? " drawink-dashboard__ws-item--active"
                          : ""
                      }`}
                      onClick={() => onSelectWorkspace(ws._id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({
                          workspaceId: ws._id,
                          x: e.clientX,
                          y: e.clientY,
                        });
                      }}
                    >
                      <span
                        className="drawink-dashboard__ws-dot"
                        style={{ background: ws.color || "#6965db" }}
                      >
                        {ws.icon || ""}
                      </span>
                      <span className="drawink-dashboard__ws-name">{ws.name}</span>
                      {ws.memberCount > 1 && (
                        <span className="drawink-dashboard__ws-member-count">
                          {ws.memberCount}
                        </span>
                      )}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Archive link */}
        <button
          className={`drawink-dashboard__sidebar-archive${showingArchive ? " drawink-dashboard__sidebar-archive--active" : ""}`}
          onClick={onShowArchive}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
          </svg>
          Archived
          {archivedCount > 0 && (
            <span className="drawink-dashboard__sidebar-archive-count">
              {archivedCount}
            </span>
          )}
        </button>

        {/* AI Usage Meter */}
        <AiUsageMeter />
      </aside>

      {/* Workspace context menu */}
      {contextMenu && (() => {
        const ctxWs = workspaces?.find((w) => w._id === contextMenu.workspaceId);
        const isCtxOwner = ctxWs?.ownerId === userId;

        return (
        <div
          ref={contextMenuRef}
          className="drawink-dashboard__ctx-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {isCtxOwner ? (
            <>
              <button
                onClick={() => {
                  if (ctxWs) {
                    setRenamingId(ctxWs._id);
                    setRenameValue(ctxWs.name);
                  }
                  setContextMenu(null);
                }}
              >
                Rename
              </button>
              <button
                onClick={() => {
                  setPickerFor({ id: contextMenu.workspaceId, type: "icon" });
                  setContextMenu(null);
                }}
              >
                Change Icon
              </button>
              <button
                onClick={() => {
                  setPickerFor({ id: contextMenu.workspaceId, type: "color" });
                  setContextMenu(null);
                }}
              >
                Change Color
              </button>
              {isTeam && (
                <button onClick={() => {
                  if (ctxWs) setMembersModalFor({ id: ctxWs._id, name: ctxWs.name });
                  setContextMenu(null);
                }}>
                  Manage Members
                </button>
              )}
              {!isTeam && (
                <button className="drawink-dashboard__ctx-disabled" onClick={(e) => e.preventDefault()}>
                  Manage Members <ProBadge tier="team" />
                </button>
              )}
              <div className="drawink-dashboard__ctx-divider" />
              <button
                className="drawink-dashboard__ctx-danger"
                onClick={() => {
                  if (ctxWs) setDeleteConfirm({ id: ctxWs._id, name: ctxWs.name });
                  setContextMenu(null);
                }}
              >
                Delete Workspace
              </button>
            </>
          ) : (
            <>
              <button onClick={() => {
                if (ctxWs) setMembersModalFor({ id: ctxWs._id, name: ctxWs.name });
                setContextMenu(null);
              }}>
                View Members
              </button>
              <div className="drawink-dashboard__ctx-divider" />
              <button
                className="drawink-dashboard__ctx-danger"
                onClick={async () => {
                  if (userId) {
                    try {
                      await removeMemberMut({ workspaceId: contextMenu.workspaceId, userId });
                      localStorage.removeItem("selectedWorkspaceId");
                    } catch (err) {
                      console.error("Failed to leave workspace:", err);
                    }
                  }
                  setContextMenu(null);
                }}
              >
                Leave Workspace
              </button>
            </>
          )}
        </div>
        );
      })()}

      {/* Picker modal */}
      {pickerFor && (
        <PickerModal
          title={pickerFor.type === "icon" ? "Choose Icon" : "Choose Color"}
          items={pickerFor.type === "icon" ? WORKSPACE_ICONS : WORKSPACE_COLORS}
          type={pickerFor.type}
          onSelect={(value) => {
            if (pickerFor.type === "icon") {
              updateWorkspace({ workspaceId: pickerFor.id, icon: value });
            } else {
              updateWorkspace({ workspaceId: pickerFor.id, color: value });
            }
            setPickerFor(null);
          }}
          onClose={() => setPickerFor(null)}
        />
      )}

      {/* Members modal */}
      {membersModalFor && (
        <MembersModal
          workspaceId={membersModalFor.id}
          workspaceName={membersModalFor.name}
          currentUserId={userId || ""}
          onClose={() => setMembersModalFor(null)}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <ConfirmDeleteModal
          title="Delete Workspace"
          itemName={deleteConfirm.name}
          description="This will permanently delete"
          requireNameConfirm
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </>
  );
};
