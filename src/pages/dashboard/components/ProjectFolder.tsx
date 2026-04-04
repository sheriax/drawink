import type { Id } from "../../../../convex/_generated/dataModel";

interface ProjectFolderProps {
  projectId: Id<"projects">;
  name: string;
  icon?: string;
  color?: string;
  boardCount: number;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export const ProjectFolder: React.FC<ProjectFolderProps> = ({
  projectId,
  name,
  icon,
  color,
  boardCount,
  onClick,
  onContextMenu,
  onDragOver,
  onDrop,
}) => {
  return (
    <div
      className="drawink-dashboard__project-folder"
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDragOver={(e) => {
        e.preventDefault();
        e.currentTarget.classList.add("drawink-dashboard__project-folder--drag-over");
        onDragOver?.(e);
      }}
      onDragLeave={(e) => {
        e.currentTarget.classList.remove("drawink-dashboard__project-folder--drag-over");
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove("drawink-dashboard__project-folder--drag-over");
        onDrop?.(e);
      }}
    >
      <div
        className="drawink-dashboard__project-folder-icon"
        style={{ background: color || "#6965db" }}
      >
        {icon || "📂"}
      </div>
      <div className="drawink-dashboard__project-folder-info">
        <span className="drawink-dashboard__project-folder-name">{name}</span>
        <span className="drawink-dashboard__project-folder-count">
          {boardCount} {boardCount === 1 ? "board" : "boards"}
        </span>
      </div>
    </div>
  );
};
