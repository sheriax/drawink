import { useRef, useEffect } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ProBadge } from "./ProBadge";

interface Project {
  _id: Id<"projects">;
  name: string;
  icon?: string;
}

interface BoardContextMenuProps {
  x: number;
  y: number;
  boardId: Id<"boards">;
  boardName: string;
  boardCount: number;
  projects: Project[];
  currentProjectId?: Id<"projects">;
  isFree: boolean;
  onRename: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveToProject: (projectId: Id<"projects"> | undefined) => void;
  onClose: () => void;
}

export const BoardContextMenu: React.FC<BoardContextMenuProps> = ({
  x,
  y,
  boardId,
  boardName,
  boardCount,
  projects,
  currentProjectId,
  isFree,
  onRename,
  onArchive,
  onDuplicate,
  onDelete,
  onMoveToProject,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Adjust position so the menu doesn't overflow the viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      el.style.left = `${Math.max(8, x - (rect.right - window.innerWidth) - 8)}px`;
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${Math.max(8, y - (rect.bottom - window.innerHeight) - 8)}px`;
    }
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="drawink-dashboard__ctx-menu"
      style={{ top: y, left: x }}
    >
      <button onClick={onRename}>Rename</button>

      <button
        onClick={() => {
          if (!isFree) onDuplicate();
        }}
        className={isFree ? "drawink-dashboard__ctx-disabled" : undefined}
        title={isFree ? "Upgrade to Pro to duplicate boards" : undefined}
      >
        Duplicate {isFree && <ProBadge />}
      </button>

      {projects.length > 0 && (
        <>
          <div className="drawink-dashboard__ctx-divider" />
          <div className="drawink-dashboard__ctx-submenu-label">Move to project</div>
          {currentProjectId && (
            <button
              className="drawink-dashboard__ctx-submenu-item"
              onClick={() => onMoveToProject(undefined)}
            >
              No project
            </button>
          )}
          {projects
            .filter((p) => p._id !== currentProjectId)
            .map((p) => (
              <button
                key={p._id}
                className="drawink-dashboard__ctx-submenu-item"
                onClick={() => onMoveToProject(p._id)}
              >
                {p.icon || "📂"} {p.name}
              </button>
            ))}
        </>
      )}

      <div className="drawink-dashboard__ctx-divider" />
      <button onClick={onArchive}>Archive</button>
      {boardCount > 1 ? (
        <button className="drawink-dashboard__ctx-danger" onClick={onDelete}>
          Delete permanently
        </button>
      ) : (
        <button
          className="drawink-dashboard__ctx-disabled"
          title="Cannot delete the last board"
          onClick={(e) => e.preventDefault()}
        >
          Delete permanently
        </button>
      )}
    </div>
  );
};
