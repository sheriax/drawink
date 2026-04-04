import { useCallback, useState } from "react";
import type { SortOption, ViewMode } from "../constants";

export function useLocalPreferences() {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    return (localStorage.getItem("dashboardViewMode") as ViewMode) || "grid";
  });

  const [sortOrder, setSortOrderState] = useState<SortOption>(() => {
    return (localStorage.getItem("dashboardSortOrder") as SortOption) || "opened-recent";
  });

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem("dashboardViewMode", mode);
  }, []);

  const setSortOrder = useCallback((order: SortOption) => {
    setSortOrderState(order);
    localStorage.setItem("dashboardSortOrder", order);
  }, []);

  return { viewMode, setViewMode, sortOrder, setSortOrder };
}
