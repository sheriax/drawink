/**
 * Dashboard Page
 * Shows recent boards, quick create button, and team activity
 */

import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTRPC } from "../lib/trpc";
import type { Board } from "@drawink/types";
import "./Dashboard.scss";

export const Dashboard: React.FC = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const trpc = useTRPC();

  const [recentBoards, setRecentBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  // Load selected organization from localStorage
  useEffect(() => {
    const savedOrgId = localStorage.getItem("selectedOrganizationId");
    if (savedOrgId && savedOrgId !== "personal") {
      setSelectedOrg(savedOrgId);
    }
  }, []);

  // Load recent boards
  useEffect(() => {
    if (!isLoaded || !user) {
      setIsLoading(false);
      return;
    }

    const loadRecentBoards = async () => {
      setIsLoading(true);
      try {
        // TODO: Implement board fetching from API/Firestore
        // For now, load from localStorage (existing boards)
        const boards = loadBoardsFromLocalStorage();
        setRecentBoards(boards);
      } catch (error) {
        console.error("Failed to load boards:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentBoards();
  }, [isLoaded, user, selectedOrg]);

  // Load boards from localStorage (temporary until API is ready)
  const loadBoardsFromLocalStorage = (): Board[] => {
    const boards: Board[] = [];
    const storageKeys = Object.keys(localStorage);

    // Filter keys that look like board IDs
    const boardKeys = storageKeys.filter(key =>
      key.startsWith("drawink-") && !key.includes("-files")
    );

    for (const key of boardKeys.slice(0, 10)) { // Limit to 10 recent boards
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          // Create a minimal Board object
          boards.push({
            id: key.replace("drawink-", ""),
            name: parsed.name || "Untitled Board",
            thumbnail: parsed.thumbnail,
            projectId: null,
            organizationId: selectedOrg,
            ownerId: user?.id || "",
            collaborators: [],
            isPublic: false,
            createdAt: parsed.createdAt || new Date(),
            updatedAt: parsed.updatedAt || new Date(),
            lastOpenedAt: parsed.lastOpenedAt || new Date(),
            version: 1,
          } as Board);
        }
      } catch (error) {
        console.error(`Failed to parse board ${key}:`, error);
      }
    }

    // Sort by lastOpenedAt
    return boards.sort((a, b) =>
      new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime()
    );
  };

  const handleCreateBoard = () => {
    // Generate a new board ID and navigate to it
    const newBoardId = Math.random().toString(36).substring(2, 15);
    navigate(`/#${newBoardId}`);
  };

  const handleOpenBoard = (boardId: string) => {
    navigate(`/#${boardId}`);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

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

          {isLoading ? (
            <div className="dashboard-loading-inline">
              <div className="spinner-small"></div>
              <span>Loading boards...</span>
            </div>
          ) : recentBoards.length === 0 ? (
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
                  key={board.id}
                  className="board-card"
                  onClick={() => handleOpenBoard(board.id)}
                >
                  <div className="board-card__thumbnail">
                    {board.thumbnail ? (
                      <img src={board.thumbnail} alt={board.name} />
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
                      {formatDate(board.lastOpenedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Team Activity Section (only if in organization) */}
        {selectedOrg && (
          <section className="dashboard-section">
            <h2>Team Activity</h2>
            <div className="dashboard-empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p>Team activity coming soon</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
