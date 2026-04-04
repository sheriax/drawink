import { useRef, useEffect } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";

interface ProjectContextMenuProps {
  x: number;
  y: number;
  projectId: Id<"projects">;
  projectName: string;
  onRename: () => void;
  onChangeIcon: () => void;
  onChangeColor: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const ProjectContextMenu: React.FC<ProjectContextMenuProps> = ({
  x,
  y,
  onRename,
  onChangeIcon,
  onChangeColor,
  onDelete,
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

  return (
    <div
      ref={ref}
      className="drawink-dashboard__ctx-menu"
      style={{ top: y, left: x }}
    >
      <button onClick={onRename}>Rename</button>
      <button onClick={onChangeIcon}>Change Icon</button>
      <button onClick={onChangeColor}>Change Color</button>
      <div className="drawink-dashboard__ctx-divider" />
      <button className="drawink-dashboard__ctx-danger" onClick={onDelete}>
        Delete Project
      </button>
    </div>
  );
};
