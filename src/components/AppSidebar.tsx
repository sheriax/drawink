import { DefaultSidebar, Sidebar } from "@/core";
import { useUIAppState } from "@/core/context/ui-appState";

import "./AppSidebar.scss";
import { ProjectsSidebar } from "./ProjectsSidebar";

export const AppSidebar = () => {
  const { openSidebar } = useUIAppState();

  return (
    <DefaultSidebar>
      <DefaultSidebar.TabTriggers>
        <Sidebar.TabTrigger
          tab="projects"
          style={{ opacity: openSidebar?.tab === "projects" ? 1 : 0.4 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </Sidebar.TabTrigger>
      </DefaultSidebar.TabTriggers>
      <Sidebar.Tab tab="projects">
        <ProjectsSidebar />
      </Sidebar.Tab>
    </DefaultSidebar>
  );
};
