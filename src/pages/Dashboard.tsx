/**
 * Dashboard Page
 * Shows recent boards, quick create button, and team activity
 */

import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTRPC } from "../lib/trpc";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Board } from "@/lib/types";
import "./Dashboard.scss";

export const Dashboard: React.FC = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const trpc = useTRPC();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  // Convex queries - real-time data!
  const workspaces = useQuery(api.workspaces.listMine);
  const recentBoards = useQuery(
    api.boards.listByWorkspace,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip"
  );

  // Convex mutations
  const createBoard = useMutation(api.boards.create);
  const ensureDefaultWorkspace = useMutation(api.workspaces.ensureDefault);

  // Load selected workspace from localStorage
  useEffect(() => {
    const savedWorkspaceId = localStorage.getItem("selectedWorkspaceId");
    if (savedWorkspaceId) {
      setSelectedWorkspaceId(savedWorkspaceId);
    }
  }, []);

  // Ensure user has a default workspace
  useEffect(() => {
    if (!isLoaded || !user) return;

    // If no workspace is selected and we have workspaces loaded
    if (!selectedWorkspaceId && workspaces && workspaces.length > 0) {
      const defaultWorkspace = workspaces[0];
      setSelectedWorkspaceId(defaultWorkspace._id);
      localStorage.setItem("selectedWorkspaceId", defaultWorkspace._id);
    }

    // If no workspaces exist, create a default one
    if (workspaces && workspaces.length === 0) {
      ensureDefaultWorkspace({}).then((workspaceId) => {
        setSelectedWorkspaceId(workspaceId);
        localStorage.setItem("selectedWorkspaceId", workspaceId);
      });
    }
  }, [isLoaded, user, workspaces, selectedWorkspaceId, ensureDefaultWorkspace]);

  const handleCreateBoard = async () => {
    if (!selectedWorkspaceId) {
      console.error("No workspace selected");
      return;
    }

    try {
      // Create board in Convex
      const boardId = await createBoard({
        workspaceId: selectedWorkspaceId,
        name: "Untitled Board",
        isPublic: false,
      });

      // Navigate to the new board
      navigate(`/#${boardId}`);
    } catch (error) {
      console.error("Failed to create board:", error);
    }
  };

  const handleOpenBoard = (boardId: string) => {
    navigate(`/#${boardId}`);
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

  // Loading state
  const isLoadingBoards = recentBoards === undefined || workspaces === undefined;

  if (!isLoaded) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-empty">
        <h2>Welcome to Drawink</h2>
        <p>Please sign in to access your boards</p>
        <button onClick={() => navigate("/sign-in")} className="btn-primary">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header__title">
          <h1>Dashboard</h1>
          <p>Welcome back, {user.firstName || user.username || "there"}!</p>
        </div>
        <button onClick={handleCreateBoard} className="btn-primary">
          + New Board
        </button>
      </div>

      <div className="dashboard-content">
        {/* Recent Boards Section */}
        <section className="dashboard-section">
          <h2>Recent Boards</h2>

          {isLoadingBoards ? (
            <div className="dashboard-loading-inline">
              <div className="spinner-small"></div>
              <span>Loading boards...</span>
            </div>
          ) : !recentBoards || recentBoards.length === 0 ? (
            <div className="dashboard-empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3>No boards yet</h3>
              <p>Create your first board to get started</p>
              <button onClick={handleCreateBoard} className="btn-secondary">
                Create Board
              </button>
            </div>
          ) : (
            <div className="dashboard-boards-grid">
              {recentBoards.map((board) => (
                <div
                  key={board._id}
                  className="board-card"
                  onClick={() => handleOpenBoard(board._id)}
                >
                  <div className="board-card__thumbnail">
                    {board.thumbnailUrl ? (
                      <img src={board.thumbnailUrl} alt={board.name} />
                    ) : (
                      <div className="board-card__thumbnail-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="board-card__info">
                    <h3>{board.name}</h3>
                    <p className="board-card__date">
                      {formatDate(board._creationTime)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Workspace Selector */}
        {workspaces && workspaces.length > 1 && (
          <section className="dashboard-section">
            <h2>Workspace</h2>
            <select
              value={selectedWorkspaceId || ""}
              onChange={(e) => {
                const newWorkspaceId = e.target.value;
                setSelectedWorkspaceId(newWorkspaceId);
                localStorage.setItem("selectedWorkspaceId", newWorkspaceId);
              }}
              className="workspace-selector"
            >
              {workspaces.map((workspace) => (
                <option key={workspace._id} value={workspace._id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </section>
        )}
      </div>
    </div>
  );
};
