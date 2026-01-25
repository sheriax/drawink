/**
 * Projects Sidebar
 * Shows projects/folders hierarchy with boards
 */

import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useTRPC } from "../lib/trpc";
import type { Project } from "@drawink/types";
import "./ProjectsSidebar.scss";

export const ProjectsSidebar: React.FC = () => {
  const { user, isLoaded } = useUser();
  const trpc = useTRPC();

  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  // Load selected organization from localStorage
  useEffect(() => {
    const savedOrgId = localStorage.getItem("selectedOrganizationId");
    if (savedOrgId && savedOrgId !== "personal") {
      setSelectedOrg(savedOrgId);
    }
  }, []);

  // Load projects
  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }

    const loadProjects = async () => {
      setIsLoading(true);
      try {
        if (selectedOrg) {
          // Load organization projects
          const orgProjects = await trpc.project.organizationProjects.query({
            organizationId: selectedOrg,
          });
          setProjects(orgProjects);
        } else {
          // Load personal projects
          const myProjects = await trpc.project.myProjects.query();
          setProjects(myProjects);
        }
      } catch (error) {
        console.error("Failed to load projects:", error);
        setProjects([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [isLoaded, user, selectedOrg]);

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
    const name = prompt("Enter project name:");
    if (!name) return;

    try {
      await trpc.project.create.mutate({
        name,
        organizationId: selectedOrg || undefined,
      });

      // Reload projects
      if (selectedOrg) {
        const orgProjects = await trpc.project.organizationProjects.query({
          organizationId: selectedOrg,
        });
        setProjects(orgProjects);
      } else {
        const myProjects = await trpc.project.myProjects.query();
        setProjects(myProjects);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project. Please try again.");
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
          <div className="spinner-small"></div>
          <span>Loading projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="projects-sidebar__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
            <div key={project.id} className="project-item">
              <div
                className="project-item__header"
                onClick={() => toggleProject(project.id)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  className={`project-item__chevron ${
                    expandedProjects.has(project.id) ? "expanded" : ""
                  }`}
                >
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="project-item__name">{project.name}</span>
              </div>

              {expandedProjects.has(project.id) && (
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
