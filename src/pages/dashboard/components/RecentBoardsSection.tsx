import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../convex/_generated/api";
import { formatDate } from "../utils";

export const RecentBoardsSection: React.FC = () => {
  const navigate = useNavigate();
  const recentBoards = useQuery(api.boards.listRecentAcrossWorkspaces, { limit: 8 });

  if (!recentBoards || recentBoards.length === 0) return null;

  return (
    <div className="drawink-dashboard__recent">
      <h2 className="drawink-dashboard__recent-title">Recently Opened</h2>
      <div className="drawink-dashboard__recent-scroll">
        {recentBoards.map((board) => (
          <button
            key={board._id}
            className="drawink-dashboard__recent-card"
            onClick={() =>
              navigate(`/workspace/${board.workspaceId}/board/${board._id}`)
            }
          >
            <div className="drawink-dashboard__recent-card-thumb">
              {board.thumbnailUrl ? (
                <img src={board.thumbnailUrl} alt={board.name} />
              ) : (
                <svg
                  width="24"
                  height="24"
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
            <div className="drawink-dashboard__recent-card-info">
              <span className="drawink-dashboard__recent-card-name">
                {board.name}
              </span>
              <span className="drawink-dashboard__recent-card-meta">
                <span
                  className="drawink-dashboard__recent-card-ws-dot"
                  style={{ background: board.workspaceColor || "#6965db" }}
                >
                  {board.workspaceIcon || ""}
                </span>
                {board.workspaceName}
              </span>
              <span className="drawink-dashboard__recent-card-time">
                {formatDate(board.lastOpenedAt)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
