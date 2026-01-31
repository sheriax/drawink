/**
 * Projects Sidebar
 * Shows workspace hierarchy.
 * Uses Convex workspaces instead of tRPC.
 */

import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import "./ProjectsSidebar.scss";

export const ProjectsSidebar: React.FC = () => {
  const { user, isLoaded } = useUser();
  const workspaces = useQuery(api.workspaces.listMine);
  const createWorkspace = useMutation(api.workspaces.create);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(),
  );

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleCreateProject = async () => {
    const name = prompt("Enter workspace name:");
    if (!name) return;

    try {
      await createWorkspace({ name });
    } catch (error) {
      console.error("Failed to create workspace:", error);
      alert("Failed to create workspace. Please try again.");
    }
  };

  if (!isLoaded || !user) {
    return (
      <div className="projects-sidebar">
        <div className="projects-sidebar__empty">
          <p>Sign in to see your projects</p>
        </div>
      </div>
    );
  }

  const isLoading = workspaces === undefined;
  const projects = workspaces ?? [];

  return (
    <div className="projects-sidebar">
      <div className="projects-sidebar__header">
        <h3>Projects</h3>
        <button
          onClick={handleCreateProject}
          className="projects-sidebar__create-btn"
          title="Create new project"
        >
          +
        </button>
      </div>

      {isLoading ? (
        <div className="projects-sidebar__loading">
          <div className="spinner-small" />
          <span>Loading projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="projects-sidebar__empty">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p>No projects yet</p>
          <button onClick={handleCreateProject} className="btn-small">
            Create Project
          </button>
        </div>
      ) : (
        <div className="projects-sidebar__list">
          {projects.map((project) => (
            <div key={project._id} className="project-item">
              <div
                className="project-item__header"
                onClick={() => toggleProject(project._id)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  className={`project-item__chevron ${
                    expandedProjects.has(project._id) ? "expanded" : ""
                  }`}
                >
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="project-item__name">{project.name}</span>
              </div>

              {expandedProjects.has(project._id) && (
                <div className="project-item__boards">
                  <div className="project-item__empty-boards">
                    <p>No boards in this project yet</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
