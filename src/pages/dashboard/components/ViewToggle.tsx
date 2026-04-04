import type { ViewMode } from "../constants";

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="drawink-dashboard__view-toggle">
      <button
        className={`drawink-dashboard__view-toggle-btn${viewMode === "grid" ? " drawink-dashboard__view-toggle-btn--active" : ""}`}
        onClick={() => onViewModeChange("grid")}
        title="Grid view"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
      </button>
      <button
        className={`drawink-dashboard__view-toggle-btn${viewMode === "list" ? " drawink-dashboard__view-toggle-btn--active" : ""}`}
        onClick={() => onViewModeChange("list")}
        title="List view"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      </button>
    </div>
  );
};
