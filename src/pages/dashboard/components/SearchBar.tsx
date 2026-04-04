import { useRef, useState, useEffect } from "react";
import type { SortOption } from "../constants";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortOrder: SortOption;
  onSortChange: (order: SortOption) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "opened-recent", label: "Last Opened" },
  { value: "created-newest", label: "Newest" },
  { value: "created-oldest", label: "Oldest" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  sortOrder,
  onSortChange,
  searchInputRef,
}) => {
  const fallbackRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef || fallbackRef;
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortOpen]);

  const currentLabel = SORT_OPTIONS.find((o) => o.value === sortOrder)?.label ?? "Sort";

  return (
    <div className="drawink-dashboard__search-bar">
      <div className="drawink-dashboard__search-input-wrapper">
        <svg
          className="drawink-dashboard__search-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="drawink-dashboard__search-input"
          placeholder="Search boards... ( / )"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button
            className="drawink-dashboard__search-clear"
            onClick={() => onSearchChange("")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="drawink-dashboard__sort-wrapper" ref={sortRef}>
        <button
          className="drawink-dashboard__sort-trigger"
          onClick={() => setSortOpen(!sortOpen)}
        >
          {currentLabel}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {sortOpen && (
          <div className="drawink-dashboard__sort-dropdown">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`drawink-dashboard__sort-option${opt.value === sortOrder ? " drawink-dashboard__sort-option--active" : ""}`}
                onClick={() => {
                  onSortChange(opt.value);
                  setSortOpen(false);
                }}
              >
                {opt.value === sortOrder && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
