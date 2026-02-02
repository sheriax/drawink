/**
 * Dashboard Page
 * Shows recent boards, quick create button, and workspace overview.
 * Styled to match the Drawink application theme.
 */

import { useUser, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
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

const DashboardContent: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [selectedWorkspaceId, setSelectedWorkspaceId] =
    useState<Id<"workspaces"> | null>(null);

  const workspaces = useQuery(api.workspaces.listMine);
  const recentBoards = useQuery(
    api.boards.listByWorkspace,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip",
  );

  const createBoard = useMutation(api.boards.create);
  const ensureDefaultWorkspace = useMutation(api.workspaces.ensureDefault);

  useEffect(() => {
    const savedWorkspaceId = localStorage.getItem("selectedWorkspaceId");
    if (savedWorkspaceId) {
      setSelectedWorkspaceId(savedWorkspaceId as Id<"workspaces">);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    if (!selectedWorkspaceId && workspaces && workspaces.length > 0) {
      const defaultWorkspace = workspaces[0];
      setSelectedWorkspaceId(defaultWorkspace._id);
      localStorage.setItem("selectedWorkspaceId", defaultWorkspace._id);
    }

    if (workspaces && workspaces.length === 0) {
      ensureDefaultWorkspace({}).then((workspaceId) => {
        setSelectedWorkspaceId(workspaceId);
        localStorage.setItem("selectedWorkspaceId", workspaceId);
      });
    }
  }, [user, workspaces, selectedWorkspaceId, ensureDefaultWorkspace]);

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

  const isLoadingBoards =
    recentBoards === undefined || workspaces === undefined;

  return (
    <div className="drawink-dashboard">
      {/* Top nav bar */}
      <header className="drawink-dashboard__nav">
        <button
          className="drawink-dashboard__back-btn"
          onClick={() => navigate("/")}
          title="Back to canvas"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="drawink-dashboard__logo">Drawink</span>

        {workspaces && workspaces.length > 1 && (
          <select
            className="drawink-dashboard__workspace-select"
            value={selectedWorkspaceId || ""}
            onChange={(e) => {
              const id = e.target.value as Id<"workspaces">;
              setSelectedWorkspaceId(id);
              localStorage.setItem("selectedWorkspaceId", id);
            }}
          >
            {workspaces.map((ws) => (
              <option key={ws._id} value={ws._id}>
                {ws.name}
              </option>
            ))}
          </select>
        )}

        <div className="drawink-dashboard__nav-right">
          <span className="drawink-dashboard__greeting">
            {user?.firstName || user?.username || ""}
          </span>
          {user?.imageUrl && (
            <img
              src={user.imageUrl}
              alt=""
              className="drawink-dashboard__avatar"
            />
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="drawink-dashboard__main">
        <div className="drawink-dashboard__toolbar">
          <h1 className="drawink-dashboard__title">Your Boards</h1>
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
        ) : (
          <div className="drawink-dashboard__grid">
            {/* New board card */}
            <button
              className="drawink-dashboard__card drawink-dashboard__card--new"
              onClick={handleCreateBoard}
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

            {recentBoards.map((board) => (
              <div
                key={board._id}
                className="drawink-dashboard__card"
                onClick={() => handleOpenBoard(board._id)}
              >
                <div className="drawink-dashboard__card-thumb">
                  {board.thumbnailUrl ? (
                    <img src={board.thumbnailUrl} alt={board.name} />
                  ) : (
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 21V9" />
                    </svg>
                  )}
                </div>
                <div className="drawink-dashboard__card-info">
                  <span className="drawink-dashboard__card-name">
                    {board.name}
                  </span>
                  <span className="drawink-dashboard__card-date">
                    {formatDate(board._creationTime)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
