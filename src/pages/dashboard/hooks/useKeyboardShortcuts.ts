import { useEffect } from "react";

interface ShortcutHandlers {
  onNewBoard: () => void;
  onFocusSearch: () => void;
  onCloseAll: () => void;
}

export function useKeyboardShortcuts({
  onNewBoard,
  onFocusSearch,
  onCloseAll,
}: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Ctrl/Cmd + N — new board
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        onNewBoard();
        return;
      }

      // Ctrl/Cmd + K or / — focus search (when not in input)
      if (
        (!isInput && e.key === "/") ||
        ((e.ctrlKey || e.metaKey) && e.key === "k")
      ) {
        e.preventDefault();
        onFocusSearch();
        return;
      }

      // Escape — close modals/menus
      if (e.key === "Escape") {
        onCloseAll();
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onNewBoard, onFocusSearch, onCloseAll]);
}
