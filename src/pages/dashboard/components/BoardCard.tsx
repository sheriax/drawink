import { useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { CollaboratorAvatars } from "./CollaboratorAvatars";
import { formatDate } from "../utils";

interface Collaborator {
  userId: string;
  userName: string;
  userPhotoUrl?: string;
}

interface BoardCardProps {
  boardId: Id<"boards">;
  name: string;
  thumbnailUrl?: string;
  createdAt: number;
  lastOpenedAt: number;
  isStarred: boolean;
  collaborators: Collaborator[];
  showCollabAvatars: boolean;
  isRenamingBoard: boolean;
  boardRenameValue: string;
  onBoardRenameChange: (value: string) => void;
  onBoardRenameSubmit: () => void;
  onBoardRenameCancel: () => void;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onStarToggle: () => void;
  onDragStart?: (e: React.DragEvent) => void;
}

export const BoardCard: React.FC<BoardCardProps> = ({
  boardId,
  name,
  thumbnailUrl,
  createdAt,
  lastOpenedAt,
  isStarred,
  collaborators,
  showCollabAvatars,
  isRenamingBoard,
  boardRenameValue,
  onBoardRenameChange,
  onBoardRenameSubmit,
  onBoardRenameCancel,
  onClick,
  onContextMenu,
  onStarToggle,
  onDragStart,
}) => {
  return (
    <div
      className="drawink-dashboard__card"
      onClick={() => {
        if (!isRenamingBoard) onClick();
      }}
      onContextMenu={onContextMenu}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
    >
      <div className="drawink-dashboard__card-thumb">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={name} />
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
        {collaborators.length > 0 && (
          <div className="drawink-dashboard__card-collab">
            <CollaboratorAvatars
              collaborators={collaborators}
              showAvatars={showCollabAvatars}
            />
          </div>
        )}
      </div>
      <button
        className="drawink-dashboard__card-star"
        onClick={(e) => {
          e.stopPropagation();
          onStarToggle();
        }}
        title={isStarred ? "Remove from favorites" : "Add to favorites"}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={isStarred ? "#fb8c00" : "none"}
          stroke={isStarred ? "#fb8c00" : "currentColor"}
          strokeWidth="2"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>
      <button
        className="drawink-dashboard__card-menu"
        onClick={(e) => {
          e.stopPropagation();
          onContextMenu(e);
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      <div className="drawink-dashboard__card-info">
        {isRenamingBoard ? (
          <input
            className="drawink-dashboard__board-rename-input"
            type="text"
            value={boardRenameValue}
            onChange={(e) => onBoardRenameChange(e.target.value)}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") onBoardRenameSubmit();
              if (e.key === "Escape") onBoardRenameCancel();
            }}
            onBlur={onBoardRenameSubmit}
          />
        ) : (
          <span className="drawink-dashboard__card-name">{name}</span>
        )}
        <span className="drawink-dashboard__card-date">
          {formatDate(lastOpenedAt)}
        </span>
      </div>
    </div>
  );
};
