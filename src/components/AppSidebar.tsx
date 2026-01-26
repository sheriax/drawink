import { DefaultSidebar, Sidebar, THEME } from "@/core";
import { messageCircleIcon, presentationIcon } from "@/core/components/icons";
// import { LinkButton } from "@/core/components/LinkButton";
import { useUIAppState } from "@/core/context/ui-appState";

import "./AppSidebar.scss";
import { ProjectsSidebar } from "./ProjectsSidebar";

export const AppSidebar = () => {
  const { theme, openSidebar } = useUIAppState();

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
        <Sidebar.TabTrigger
          tab="comments"
          style={{ opacity: openSidebar?.tab === "comments" ? 1 : 0.4 }}
        >
          {messageCircleIcon}
        </Sidebar.TabTrigger>
        <Sidebar.TabTrigger
          tab="presentation"
          style={{ opacity: openSidebar?.tab === "presentation" ? 1 : 0.4 }}
        >
          {presentationIcon}
        </Sidebar.TabTrigger>
      </DefaultSidebar.TabTriggers>
      <Sidebar.Tab tab="projects">
        <ProjectsSidebar />
      </Sidebar.Tab>
      <Sidebar.Tab tab="comments">
        <div className="app-sidebar-promo-container">
          <div
            className="app-sidebar-promo-image"
            style={{
              ["--image-source" as any]: `url(/oss_promo_comments_${
                theme === THEME.DARK ? "dark" : "light"
              }.jpg)`,
              opacity: 0.7,
            }}
          />
          <div className="app-sidebar-promo-text">Make comments with Drawink Pro</div>
          {/* <LinkButton
            href={`${
              import.meta.env.VITE_APP_PLUS_LP
            }/plus?utm_source=drawink&utm_medium=app&utm_content=comments_promo#drawink-redirect`}
          >
            Sign up now
          </LinkButton> */}
        </div>
      </Sidebar.Tab>
      <Sidebar.Tab tab="presentation" className="px-3">
        <div className="app-sidebar-promo-container">
          <div
            className="app-sidebar-promo-image"
            style={{
              ["--image-source" as any]: `url(/oss_promo_presentations_${
                theme === THEME.DARK ? "dark" : "light"
              }.svg)`,
              backgroundSize: "60%",
              opacity: 0.4,
            }}
          />
          <div className="app-sidebar-promo-text">Create presentations with Drawink Pro</div>
          {/* <LinkButton
            href={`${
              import.meta.env.VITE_APP_PLUS_LP
            }/plus?utm_source=drawink&utm_medium=app&utm_content=presentations_promo#drawink-redirect`}
          >
            Sign up now
          </LinkButton> */}
        </div>
      </Sidebar.Tab>
    </DefaultSidebar>
  );
};
