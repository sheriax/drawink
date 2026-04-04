import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { hybridStorageAdapter } from "@/data/HybridStorageAdapter";
import { formatDate } from "../utils";
import { useState } from "react";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface ArchiveViewProps {
  workspaceId: Id<"workspaces">;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ workspaceId }) => {
  const archivedBoards = useQuery(api.boards.listArchived, { workspaceId });
  const unarchive = useMutation(api.boards.unarchive);
  const permanentDelete = useMutation(api.boards.permanentDelete);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: Id<"boards">;
    name: string;
  } | null>(null);

  const handleRestore = async (boardId: Id<"boards">) => {
    try {
      await unarchive({ boardId });
    } catch (error) {
      console.error("Failed to restore board:", error);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await permanentDelete({ boardId: deleteConfirm.id });
      await hybridStorageAdapter.deleteBoard(deleteConfirm.id);
    } catch (error) {
      console.error("Failed to delete board:", error);
    }
    setDeleteConfirm(null);
  };

  if (archivedBoards === undefined) {
    return (
      <div className="drawink-dashboard__loading">
        <div className="drawink-dashboard__spinner" />
        <span>Loading archived boards...</span>
      </div>
    );
  }

  if (archivedBoards.length === 0) {
    return (
      <div className="drawink-dashboard__empty">
        <div className="drawink-dashboard__empty-icon">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
          </svg>
        </div>
        <h2>No archived boards</h2>
        <p>Boards you archive will appear here</p>
      </div>
    );
  }

  return (
    <>
      <div className="drawink-dashboard__archive-list">
        {archivedBoards.map((board) => (
          <div key={board._id} className="drawink-dashboard__archive-item">
            <div className="drawink-dashboard__archive-item-thumb">
              {board.thumbnailUrl ? (
                <img src={board.thumbnailUrl} alt={board.name} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              )}
            </div>
            <div className="drawink-dashboard__archive-item-info">
              <span className="drawink-dashboard__archive-item-name">{board.name}</span>
              <span className="drawink-dashboard__archive-item-date">
                Archived {board.archivedAt ? formatDate(board.archivedAt) : ""}
              </span>
            </div>
            <div className="drawink-dashboard__archive-item-actions">
              <button
                className="drawink-dashboard__archive-restore-btn"
                onClick={() => handleRestore(board._id)}
              >
                Restore
              </button>
              <button
                className="drawink-dashboard__archive-delete-btn"
                onClick={() =>
                  setDeleteConfirm({ id: board._id, name: board.name })
                }
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {deleteConfirm && (
        <ConfirmDeleteModal
          title="Delete Board Permanently"
          itemName={deleteConfirm.name}
          description="Are you sure you want to permanently delete"
          onConfirm={handlePermanentDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </>
  );
};
