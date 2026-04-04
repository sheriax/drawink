/**
 * DashboardContent — main orchestrator for the signed-in dashboard.
 * Manages queries, state, and coordinates all dashboard sub-components.
 */

import { SyncStatusBanner } from "@/components/SyncStatusBanner";
import { hybridStorageAdapter } from "@/data/HybridStorageAdapter";
import { useIsFreeTier, useIsProTier } from "@/hooks/useSubscription";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DashboardNav } from "./components/DashboardNav";
import { WorkspaceSidebar } from "./components/WorkspaceSidebar";
import { SearchBar } from "./components/SearchBar";
import { ViewToggle } from "./components/ViewToggle";
import { BoardCard } from "./components/BoardCard";
import { BoardListRow } from "./components/BoardListRow";
import { BoardContextMenu } from "./components/BoardContextMenu";
import { RecentBoardsSection } from "./components/RecentBoardsSection";
import { ProjectFolder } from "./components/ProjectFolder";
import { ProjectContextMenu } from "./components/ProjectContextMenu";
import { TemplatePicker } from "./components/TemplatePicker";
import { ArchiveView } from "./components/ArchiveView";
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";
import { PickerModal } from "./components/PickerModal";
import { ProBadge } from "./components/ProBadge";
import { UpgradePrompt } from "./components/UpgradePrompt";
import { PROJECT_COLORS, PROJECT_ICONS } from "./constants";
import { useLocalPreferences } from "./hooks/useLocalPreferences";
import { useBoardSearch } from "./hooks/useBoardSearch";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { formatDate } from "./utils";
import { useEffect } from "react";

export const DashboardContent: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const isFree = useIsFreeTier();
  const isPro = useIsProTier();
  const { viewMode, setViewMode, sortOrder, setSortOrder } = useLocalPreferences();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Core state ──
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<Id<"workspaces"> | null>(() => {
    return (localStorage.getItem("selectedWorkspaceId") as Id<"workspaces">) || null;
  });
  const [showingArchive, setShowingArchive] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);

  // Board context menu
  const [boardContextMenu, setBoardContextMenu] = useState<{
    boardId: Id<"boards">;
    boardName: string;
    x: number;
    y: number;
  } | null>(null);
  const [renamingBoardId, setRenamingBoardId] = useState<Id<"boards"> | null>(null);
  const [boardRenameValue, setBoardRenameValue] = useState("");
  const [deleteBoardConfirm, setDeleteBoardConfirm] = useState<{
    id: Id<"boards">;
    name: string;
  } | null>(null);

  // Project state
  const [projectContextMenu, setProjectContextMenu] = useState<{
    projectId: Id<"projects">;
    projectName: string;
    x: number;
    y: number;
  } | null>(null);
  const [renamingProjectId, setRenamingProjectId] = useState<Id<"projects"> | null>(null);
  const [projectRenameValue, setProjectRenameValue] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [projectPickerFor, setProjectPickerFor] = useState<{
    id: Id<"projects">;
    type: "icon" | "color";
  } | null>(null);
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState<{
    id: Id<"projects">;
    name: string;
  } | null>(null);

  // Template state
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showNewBoardDropdown, setShowNewBoardDropdown] = useState(false);
  const newBoardDropdownRef = useRef<HTMLDivElement>(null);

  // Upgrade prompt
  const [upgradePrompt, setUpgradePrompt] = useState<{
    tier: "pro" | "team";
    feature: string;
  } | null>(null);

  // Dragging
  const [dragBoardId, setDragBoardId] = useState<Id<"boards"> | null>(null);

  // ── Queries ──
  const workspaces = useQuery(api.workspaces.listMine);

  // Only query if workspace ID is valid (exists in user's workspace list)
  const validWorkspaceId =
    selectedWorkspaceId && workspaces?.some((ws) => ws._id === selectedWorkspaceId)
      ? selectedWorkspaceId
      : null;

  const boards = useQuery(
    api.boards.listByWorkspace,
    validWorkspaceId ? { workspaceId: validWorkspaceId } : "skip",
  );
  const archivedBoards = useQuery(
    api.boards.listArchived,
    validWorkspaceId ? { workspaceId: validWorkspaceId } : "skip",
  );
  const projects = useQuery(
    api.projects.listByWorkspace,
    validWorkspaceId ? { workspaceId: validWorkspaceId } : "skip",
  );
  const starredBoards = useQuery(api.boardStars.listStarred);
  const pendingInvitations = useQuery(api.invitations.listPendingForUser);
  const boardIds = boards?.map((b) => b._id) || [];
  const activeSessions = useQuery(
    api.collaboration.getActiveSessionsForBoards,
    boardIds.length > 0 ? { boardIds } : "skip",
  );

  // ── Mutations ──
  const createBoard = useMutation(api.boards.create);
  const ensureDefaultWorkspace = useMutation(api.workspaces.ensureDefault);
  const updateBoard = useMutation(api.boards.update);
  const archiveBoard = useMutation(api.boards.archive);
  const deleteBoard = useMutation(api.boards.permanentDelete);
  const duplicateBoard = useMutation(api.boards.duplicate);
  const toggleStar = useMutation(api.boardStars.toggle);
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const deleteProjectMut = useMutation(api.projects.permanentDelete);
  const acceptInvitation = useMutation(api.invitations.acceptInvitation);
  const declineInvitation = useMutation(api.invitations.declineInvitation);
  const incrementTemplateUsage = useMutation(api.templates.incrementUsage);

  // ── Derived data ──
  const starredSet = new Set(starredBoards?.map((s) => s.boardId) || []);

  // Filter boards by project if selected
  const projectFilteredBoards = selectedProjectId
    ? boards?.filter((b) => b.projectId === selectedProjectId)
    : boards;

  const { searchTerm, setSearchTerm, filteredBoards } = useBoardSearch(
    projectFilteredBoards,
    sortOrder,
  );

  const selectedWorkspace = workspaces?.find((ws) => ws._id === selectedWorkspaceId);
  const selectedProject = selectedProjectId
    ? projects?.find((p) => p._id === selectedProjectId)
    : null;
  const isLoadingBoards = boards === undefined || workspaces === undefined;

  // Count boards per project for folder display
  const boardCountByProject = new Map<string, number>();
  if (boards) {
    for (const b of boards) {
      if (b.projectId) {
        boardCountByProject.set(
          b.projectId,
          (boardCountByProject.get(b.projectId) || 0) + 1,
        );
      }
    }
  }

  // Total board count for free tier enforcement
  const totalBoardCount = boards?.length || 0;
  const canCreateBoard = !isFree || totalBoardCount < 3;

  // ── Effects ──
  useEffect(() => {
    if (!user) return;
    if (workspaces === undefined) return; // still loading

    if (workspaces.length === 0) {
      ensureDefaultWorkspace({}).then((id) => selectWorkspace(id));
      return;
    }

    // Validate stored workspace ID — clear if user doesn't have access to it
    if (selectedWorkspaceId && !workspaces.some((ws) => ws._id === selectedWorkspaceId)) {
      selectWorkspace(workspaces[0]._id);
      return;
    }

    if (!selectedWorkspaceId) {
      selectWorkspace(workspaces[0]._id);
    }
  }, [user, workspaces, selectedWorkspaceId, ensureDefaultWorkspace]);

  // Close new board dropdown on outside click
  useEffect(() => {
    if (!showNewBoardDropdown) return;
    const handler = (e: MouseEvent) => {
      if (
        newBoardDropdownRef.current &&
        !newBoardDropdownRef.current.contains(e.target as Node)
      ) {
        setShowNewBoardDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNewBoardDropdown]);

  // ── Handlers ──
  const selectWorkspace = (id: Id<"workspaces">) => {
    setSelectedWorkspaceId(id);
    setSelectedProjectId(null);
    setShowingArchive(false);
    localStorage.setItem("selectedWorkspaceId", id);
  };

  const handleCreateBoard = async () => {
    if (!selectedWorkspaceId) return;
    if (!canCreateBoard) {
      setUpgradePrompt({
        tier: "pro",
        feature: "You've reached the free tier limit of 3 boards. Upgrade to Pro for unlimited boards.",
      });
      return;
    }
    try {
      const boardId = await createBoard({
        workspaceId: selectedWorkspaceId,
        name: "Untitled Board",
        projectId: selectedProjectId || undefined,
      });
      navigate(`/workspace/${selectedWorkspaceId}/board/${boardId}`);
    } catch (error) {
      console.error("Failed to create board:", error);
    }
  };

  const handleCreateFromTemplate = async (templateId: Id<"templates">) => {
    if (!selectedWorkspaceId) return;
    if (!canCreateBoard) {
      setUpgradePrompt({
        tier: "pro",
        feature: "You've reached the free tier limit of 3 boards. Upgrade to Pro for unlimited boards.",
      });
      return;
    }
    try {
      const boardId = await createBoard({
        workspaceId: selectedWorkspaceId,
        name: "From Template",
        projectId: selectedProjectId || undefined,
      });
      await incrementTemplateUsage({ templateId });
      setShowTemplatePicker(false);
      navigate(`/workspace/${selectedWorkspaceId}/board/${boardId}`);
    } catch (error) {
      console.error("Failed to create board from template:", error);
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

  const handleBoardArchive = async (boardId: Id<"boards">) => {
    try {
      await archiveBoard({ boardId });
    } catch (error) {
      console.error("Failed to archive board:", error);
    }
  };

  const handleBoardDuplicate = async (boardId: Id<"boards">) => {
    try {
      await duplicateBoard({ boardId });
    } catch (error) {
      console.error("Failed to duplicate board:", error);
    }
  };

  const handleBoardDelete = async () => {
    if (!deleteBoardConfirm) return;
    try {
      await deleteBoard({ boardId: deleteBoardConfirm.id });
      await hybridStorageAdapter.deleteBoard(deleteBoardConfirm.id);
    } catch (error) {
      console.error("Failed to delete board:", error);
    }
    setDeleteBoardConfirm(null);
  };

  const handleMoveToProject = async (
    boardId: Id<"boards">,
    projectId: Id<"projects"> | undefined,
  ) => {
    try {
      await updateBoard({ boardId, projectId });
    } catch (error) {
      console.error("Failed to move board:", error);
    }
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name || !selectedWorkspaceId) return;
    if (isFree) {
      setUpgradePrompt({
        tier: "pro",
        feature: "Upgrade to Pro to organize boards into projects and folders.",
      });
      setCreatingProject(false);
      return;
    }
    try {
      await createProject({ workspaceId: selectedWorkspaceId, name });
      setCreatingProject(false);
      setNewProjectName("");
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const handleProjectRename = async (id: Id<"projects">) => {
    const name = projectRenameValue.trim();
    if (!name) {
      setRenamingProjectId(null);
      return;
    }
    try {
      await updateProject({ projectId: id, name });
    } catch (error) {
      console.error("Failed to rename project:", error);
    }
    setRenamingProjectId(null);
  };

  const handleProjectDelete = async () => {
    if (!deleteProjectConfirm) return;
    try {
      await deleteProjectMut({ projectId: deleteProjectConfirm.id });
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
    setDeleteProjectConfirm(null);
    if (selectedProjectId === deleteProjectConfirm.id) {
      setSelectedProjectId(null);
    }
  };

  const handleCloseAll = useCallback(() => {
    setBoardContextMenu(null);
    setProjectContextMenu(null);
    setShowNewBoardDropdown(false);
    setShowTemplatePicker(false);
    setUpgradePrompt(null);
    setDeleteBoardConfirm(null);
    setDeleteProjectConfirm(null);
  }, []);

  // ── Keyboard shortcuts ──
  useKeyboardShortcuts({
    onNewBoard: handleCreateBoard,
    onFocusSearch: () => searchInputRef.current?.focus(),
    onCloseAll: handleCloseAll,
  });

  return (
    <div className="drawink-dashboard">
      <SyncStatusBanner />
      <DashboardNav user={user} />

      <div className="drawink-dashboard__body">
        <WorkspaceSidebar
          workspaces={workspaces}
          selectedWorkspaceId={selectedWorkspaceId}
          userId={user?.id}
          archivedCount={archivedBoards?.length || 0}
          onSelectWorkspace={(id) => {
            selectWorkspace(id);
          }}
          onShowArchive={() => setShowingArchive(true)}
          showingArchive={showingArchive}
        />

        <main className="drawink-dashboard__main">
          {/* Pending invitations banner */}
          {pendingInvitations && pendingInvitations.length > 0 && (
            <div className="drawink-dashboard__invitations-banner">
              <div className="drawink-dashboard__invitations-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <path d="M22 6l-10 7L2 6" />
                </svg>
                You have {pendingInvitations.length} pending invitation{pendingInvitations.length > 1 ? "s" : ""}
              </div>
              {pendingInvitations.map((inv) => (
                <div key={inv._id} className="drawink-dashboard__invitation-card">
                  <div className="drawink-dashboard__invitation-info">
                    <span className="drawink-dashboard__invitation-ws">
                      {inv.workspaceIcon && <span>{inv.workspaceIcon} </span>}
                      {inv.workspaceName}
                    </span>
                    <span className="drawink-dashboard__invitation-meta">
                      Invited by {inv.inviterName} as {inv.role}
                    </span>
                  </div>
                  <div className="drawink-dashboard__invitation-actions">
                    <button
                      className="drawink-dashboard__invitation-accept"
                      onClick={async () => {
                        try {
                          const wsId = await acceptInvitation({ token: inv.token });
                          selectWorkspace(wsId);
                        } catch (err) {
                          console.error("Failed to accept invitation:", err);
                        }
                      }}
                    >
                      Accept
                    </button>
                    <button
                      className="drawink-dashboard__invitation-decline"
                      onClick={() => declineInvitation({ token: inv.token })}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Archive view */}
          {showingArchive && selectedWorkspaceId ? (
            <>
              <div className="drawink-dashboard__toolbar">
                <h1 className="drawink-dashboard__title">
                  <button
                    className="drawink-dashboard__breadcrumb-btn"
                    onClick={() => setShowingArchive(false)}
                  >
                    {selectedWorkspace?.name || "Boards"}
                  </button>
                  <span className="drawink-dashboard__breadcrumb-sep">/</span>
                  Archived
                </h1>
              </div>
              <ArchiveView workspaceId={selectedWorkspaceId} />
            </>
          ) : (
            <>
              {/* Recent Boards (only on "home" view, not inside a project) */}
              {!selectedProjectId && <RecentBoardsSection />}

              {/* Toolbar */}
              <div className="drawink-dashboard__toolbar">
                <h1 className="drawink-dashboard__title">
                  {selectedProjectId && selectedProject ? (
                    <>
                      <button
                        className="drawink-dashboard__breadcrumb-btn"
                        onClick={() => setSelectedProjectId(null)}
                      >
                        {selectedWorkspace?.icon && (
                          <span className="drawink-dashboard__title-icon">
                            {selectedWorkspace.icon}
                          </span>
                        )}
                        {selectedWorkspace?.name || "Boards"}
                      </button>
                      <span className="drawink-dashboard__breadcrumb-sep">/</span>
                      {selectedProject.icon || "📂"} {selectedProject.name}
                    </>
                  ) : (
                    <>
                      {selectedWorkspace?.icon && (
                        <span className="drawink-dashboard__title-icon">
                          {selectedWorkspace.icon}
                        </span>
                      )}
                      {selectedWorkspace?.name || "Boards"}
                    </>
                  )}
                </h1>
                <div className="drawink-dashboard__toolbar-actions">
                  {isFree && totalBoardCount > 0 && (
                    <span className="drawink-dashboard__board-count-badge">
                      {totalBoardCount}/3 boards
                    </span>
                  )}
                  <SearchBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    sortOrder={sortOrder}
                    onSortChange={setSortOrder}
                    searchInputRef={searchInputRef}
                  />
                  <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                  <div className="drawink-dashboard__new-board-wrapper" ref={newBoardDropdownRef}>
                    <button
                      className="drawink-dashboard__create-btn"
                      onClick={() => setShowNewBoardDropdown(!showNewBoardDropdown)}
                      disabled={!canCreateBoard && isFree}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      New Board
                    </button>
                    {showNewBoardDropdown && (
                      <div className="drawink-dashboard__new-board-dropdown">
                        <button onClick={() => { handleCreateBoard(); setShowNewBoardDropdown(false); }}>
                          Blank Board
                        </button>
                        <button onClick={() => { setShowTemplatePicker(true); setShowNewBoardDropdown(false); }}>
                          From Template...
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isLoadingBoards ? (
                <div className="drawink-dashboard__loading">
                  <div className="drawink-dashboard__spinner" />
                  <span>Loading boards...</span>
                </div>
              ) : (
                <>
                  {/* Projects section (only on workspace root, not inside a project) */}
                  {!selectedProjectId && projects && projects.length > 0 && (
                    <div className="drawink-dashboard__projects-section">
                      <div className="drawink-dashboard__projects-header">
                        <span className="drawink-dashboard__projects-label">Projects</span>
                      </div>
                      <div className="drawink-dashboard__projects-grid">
                        {projects.map((project) => (
                          <ProjectFolder
                            key={project._id}
                            projectId={project._id}
                            name={
                              renamingProjectId === project._id ? (
                                projectRenameValue
                              ) : (
                                project.name
                              )
                            }
                            icon={project.icon}
                            color={project.color}
                            boardCount={boardCountByProject.get(project._id) || 0}
                            onClick={() => setSelectedProjectId(project._id)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setProjectContextMenu({
                                projectId: project._id,
                                projectName: project.name,
                                x: e.clientX,
                                y: e.clientY,
                              });
                            }}
                            onDrop={(e) => {
                              if (dragBoardId) {
                                handleMoveToProject(dragBoardId, project._id);
                                setDragBoardId(null);
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New project button */}
                  {!selectedProjectId && (
                    <div className="drawink-dashboard__new-project-area">
                      {creatingProject ? (
                        <div className="drawink-dashboard__new-project-input">
                          <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Project name"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCreateProject();
                              if (e.key === "Escape") setCreatingProject(false);
                            }}
                            onBlur={() => {
                              if (!newProjectName.trim()) setCreatingProject(false);
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          className="drawink-dashboard__new-project-btn"
                          onClick={() => {
                            if (isFree) {
                              setUpgradePrompt({
                                tier: "pro",
                                feature:
                                  "Upgrade to Pro to organize boards into projects and folders.",
                              });
                            } else {
                              setCreatingProject(true);
                              setNewProjectName("");
                            }
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          New Project
                          {isFree && <ProBadge />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Boards section label */}
                  {!selectedProjectId && projects && projects.length > 0 && (
                    <div className="drawink-dashboard__boards-section-header">
                      <span className="drawink-dashboard__boards-label">
                        {searchTerm ? "Search results" : "All Boards"}
                      </span>
                    </div>
                  )}

                  {/* Board grid/list */}
                  {!filteredBoards || filteredBoards.length === 0 ? (
                    searchTerm ? (
                      <div className="drawink-dashboard__empty">
                        <h2>No boards found</h2>
                        <p>Try a different search term</p>
                      </div>
                    ) : (
                      <div className="drawink-dashboard__empty">
                        <div className="drawink-dashboard__empty-icon">
                          <svg
                            width="56"
                            height="56"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M3 9h18M9 21V9" />
                          </svg>
                        </div>
                        <h2>No boards yet</h2>
                        <p>Create your first board to start drawing</p>
                        <button
                          className="drawink-dashboard__create-btn"
                          onClick={handleCreateBoard}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          Create Board
                        </button>
                      </div>
                    )
                  ) : viewMode === "grid" ? (
                    <div className="drawink-dashboard__grid">
                      <button
                        className="drawink-dashboard__card drawink-dashboard__card--new"
                        onClick={handleCreateBoard}
                        disabled={!canCreateBoard && isFree}
                      >
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        <span>New Board</span>
                      </button>

                      {filteredBoards.map((board) => (
                        <BoardCard
                          key={board._id}
                          boardId={board._id}
                          name={board.name}
                          thumbnailUrl={board.thumbnailUrl}
                          createdAt={board._creationTime}
                          lastOpenedAt={board.lastOpenedAt}
                          isStarred={starredSet.has(board._id)}
                          collaborators={
                            (activeSessions as Record<string, Array<{ userId: string; userName: string; userPhotoUrl?: string }>> | undefined)?.[board._id] || []
                          }
                          showCollabAvatars={isPro}
                          isRenamingBoard={renamingBoardId === board._id}
                          boardRenameValue={boardRenameValue}
                          onBoardRenameChange={setBoardRenameValue}
                          onBoardRenameSubmit={() => handleBoardRename(board._id)}
                          onBoardRenameCancel={() => setRenamingBoardId(null)}
                          onClick={() =>
                            navigate(
                              `/workspace/${selectedWorkspaceId}/board/${board._id}`,
                            )
                          }
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setBoardContextMenu({
                              boardId: board._id,
                              boardName: board.name,
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                          onStarToggle={() => toggleStar({ boardId: board._id })}
                          onDragStart={(e) => {
                            setDragBoardId(board._id);
                            e.dataTransfer.setData("text/plain", board._id);
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="drawink-dashboard__list">
                      <div className="drawink-dashboard__list-header">
                        <span className="drawink-dashboard__list-header-name">Name</span>
                        <span className="drawink-dashboard__list-header-collab">Active</span>
                        <span className="drawink-dashboard__list-header-date">Last Opened</span>
                        <span className="drawink-dashboard__list-header-actions" />
                      </div>
                      {filteredBoards.map((board) => (
                        <BoardListRow
                          key={board._id}
                          boardId={board._id}
                          name={board.name}
                          thumbnailUrl={board.thumbnailUrl}
                          createdAt={board._creationTime}
                          lastOpenedAt={board.lastOpenedAt}
                          isStarred={starredSet.has(board._id)}
                          collaborators={
                            (activeSessions as Record<string, Array<{ userId: string; userName: string; userPhotoUrl?: string }>> | undefined)?.[board._id] || []
                          }
                          showCollabAvatars={isPro}
                          isRenamingBoard={renamingBoardId === board._id}
                          boardRenameValue={boardRenameValue}
                          onBoardRenameChange={setBoardRenameValue}
                          onBoardRenameSubmit={() => handleBoardRename(board._id)}
                          onBoardRenameCancel={() => setRenamingBoardId(null)}
                          onClick={() =>
                            navigate(
                              `/workspace/${selectedWorkspaceId}/board/${board._id}`,
                            )
                          }
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setBoardContextMenu({
                              boardId: board._id,
                              boardName: board.name,
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                          onStarToggle={() => toggleStar({ boardId: board._id })}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Overlays ── */}

      {/* Board context menu */}
      {boardContextMenu && (
        <BoardContextMenu
          x={boardContextMenu.x}
          y={boardContextMenu.y}
          boardId={boardContextMenu.boardId}
          boardName={boardContextMenu.boardName}
          boardCount={boards?.length || 0}
          projects={projects || []}
          currentProjectId={
            boards?.find((b) => b._id === boardContextMenu.boardId)?.projectId
          }
          isFree={isFree}
          onRename={() => {
            setRenamingBoardId(boardContextMenu.boardId);
            setBoardRenameValue(boardContextMenu.boardName);
            setBoardContextMenu(null);
          }}
          onArchive={() => {
            handleBoardArchive(boardContextMenu.boardId);
            setBoardContextMenu(null);
          }}
          onDuplicate={() => {
            handleBoardDuplicate(boardContextMenu.boardId);
            setBoardContextMenu(null);
          }}
          onDelete={() => {
            setDeleteBoardConfirm({
              id: boardContextMenu.boardId,
              name: boardContextMenu.boardName,
            });
            setBoardContextMenu(null);
          }}
          onMoveToProject={(projectId) => {
            handleMoveToProject(boardContextMenu.boardId, projectId);
            setBoardContextMenu(null);
          }}
          onClose={() => setBoardContextMenu(null)}
        />
      )}

      {/* Project context menu */}
      {projectContextMenu && (
        <ProjectContextMenu
          x={projectContextMenu.x}
          y={projectContextMenu.y}
          projectId={projectContextMenu.projectId}
          projectName={projectContextMenu.projectName}
          onRename={() => {
            setRenamingProjectId(projectContextMenu.projectId);
            setProjectRenameValue(projectContextMenu.projectName);
            setProjectContextMenu(null);
          }}
          onChangeIcon={() => {
            setProjectPickerFor({
              id: projectContextMenu.projectId,
              type: "icon",
            });
            setProjectContextMenu(null);
          }}
          onChangeColor={() => {
            setProjectPickerFor({
              id: projectContextMenu.projectId,
              type: "color",
            });
            setProjectContextMenu(null);
          }}
          onDelete={() => {
            setDeleteProjectConfirm({
              id: projectContextMenu.projectId,
              name: projectContextMenu.projectName,
            });
            setProjectContextMenu(null);
          }}
          onClose={() => setProjectContextMenu(null)}
        />
      )}

      {/* Project picker modal */}
      {projectPickerFor && (
        <PickerModal
          title={
            projectPickerFor.type === "icon" ? "Choose Icon" : "Choose Color"
          }
          items={
            projectPickerFor.type === "icon" ? PROJECT_ICONS : PROJECT_COLORS
          }
          type={projectPickerFor.type}
          onSelect={(value) => {
            if (projectPickerFor.type === "icon") {
              updateProject({ projectId: projectPickerFor.id, icon: value });
            } else {
              updateProject({ projectId: projectPickerFor.id, color: value });
            }
            setProjectPickerFor(null);
          }}
          onClose={() => setProjectPickerFor(null)}
        />
      )}

      {/* Board delete confirmation */}
      {deleteBoardConfirm && (
        <ConfirmDeleteModal
          title="Delete Board"
          itemName={deleteBoardConfirm.name}
          description="Are you sure you want to delete"
          onConfirm={handleBoardDelete}
          onCancel={() => setDeleteBoardConfirm(null)}
        />
      )}

      {/* Project delete confirmation */}
      {deleteProjectConfirm && (
        <ConfirmDeleteModal
          title="Delete Project"
          itemName={deleteProjectConfirm.name}
          description="This will delete the project. Boards inside will be moved to the workspace root. Delete"
          onConfirm={handleProjectDelete}
          onCancel={() => setDeleteProjectConfirm(null)}
        />
      )}

      {/* Template picker */}
      {showTemplatePicker && selectedWorkspaceId && (
        <TemplatePicker
          workspaceId={selectedWorkspaceId}
          onSelect={handleCreateFromTemplate}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {/* Upgrade prompt */}
      {upgradePrompt && (
        <UpgradePrompt
          tier={upgradePrompt.tier}
          feature={upgradePrompt.feature}
          onClose={() => setUpgradePrompt(null)}
        />
      )}
    </div>
  );
};
