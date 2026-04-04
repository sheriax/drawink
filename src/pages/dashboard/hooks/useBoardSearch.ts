import { useMemo, useState } from "react";
import type { SortOption } from "../constants";

interface Board {
  _id: string;
  _creationTime: number;
  name: string;
  lastOpenedAt: number;
  [key: string]: unknown;
}

export function useBoardSearch<T extends Board>(
  boards: T[] | undefined,
  sortOrder: SortOption,
) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAndSorted = useMemo(() => {
    if (!boards) return undefined;

    let result = boards;

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter((b) => b.name.toLowerCase().includes(term));
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortOrder) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "created-newest":
          return b._creationTime - a._creationTime;
        case "created-oldest":
          return a._creationTime - b._creationTime;
        case "opened-recent":
          return b.lastOpenedAt - a.lastOpenedAt;
        default:
          return 0;
      }
    });

    return result;
  }, [boards, searchTerm, sortOrder]);

  return { searchTerm, setSearchTerm, filteredBoards: filteredAndSorted };
}
