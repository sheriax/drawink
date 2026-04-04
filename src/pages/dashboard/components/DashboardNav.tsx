import type { useUser } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const THEME_KEY = "drawink-theme";

type ThemeOption = "light" | "dark" | "system";

function resolveTheme(theme: ThemeOption): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

function applyTheme(resolved: "light" | "dark") {
  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

interface DashboardNavProps {
  user: ReturnType<typeof useUser>["user"];
}

export const DashboardNav: React.FC<DashboardNavProps> = ({ user }) => {
  const navigate = useNavigate();

  const [theme, setThemeState] = useState<ThemeOption>(() => {
    return (localStorage.getItem(THEME_KEY) as ThemeOption) || "light";
  });

  const resolved = resolveTheme(theme);

  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeOption = prev === "light" ? "dark" : prev === "dark" ? "system" : "light";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(resolveTheme(next));
      return next;
    });
  }, []);

  // Apply theme on mount and listen for system preference changes
  useEffect(() => {
    applyTheme(resolved);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme, resolved]);

  // Sync when another tab/page changes the theme (e.g. homepage editor)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === THEME_KEY && e.newValue) {
        const next = e.newValue as ThemeOption;
        setThemeState(next);
        applyTheme(resolveTheme(next));
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <header className="drawink-dashboard__nav">
      <button
        className="drawink-dashboard__back-btn"
        onClick={() => {
          const lastBoardId = localStorage.getItem("drawink-current-board-id");
          const lastWsId = localStorage.getItem("selectedWorkspaceId");
          if (lastBoardId && lastWsId) {
            navigate(`/workspace/${lastWsId}/board/${lastBoardId}`);
          } else {
            navigate("/");
          }
        }}
        title="Back to canvas"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="drawink-dashboard__logo">Drawink</span>
      <div className="drawink-dashboard__nav-right">
        <button
          className="drawink-dashboard__theme-btn"
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
        >
          {resolved === "dark" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
          {theme === "system" && <span className="drawink-dashboard__theme-badge">A</span>}
        </button>
        <span className="drawink-dashboard__greeting">
          {user?.firstName || user?.username || ""}
        </span>
        {user?.imageUrl && (
          <img src={user.imageUrl} alt="" className="drawink-dashboard__avatar" />
        )}
      </div>
    </header>
  );
};
