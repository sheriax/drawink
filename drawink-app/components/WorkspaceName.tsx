import React, { useState, useEffect, useRef } from "react";
import { useAtom, useAtomValue } from "jotai";
import { currentWorkspaceAtom, workspacesAtom, LOCAL_WORKSPACE_ID } from "../workspace/workspaceAtom";
import { useWorkspace } from "../workspace";
import { useAuth } from "../auth";

import "./WorkspaceName.scss";

export const WorkspaceName = () => {
  const currentWorkspace = useAtomValue(currentWorkspaceAtom);
  const { renameWorkspace, selectWorkspace, workspaces } = useWorkspace();
  const { isAuthenticated } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDoubleClick = () => {
    if (isAuthenticated && currentWorkspace?.id !== LOCAL_WORKSPACE_ID) {
      setIsEditing(true);
      // setIsMenuOpen(false); 
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (currentWorkspace && name.trim() !== currentWorkspace.name) {
      renameWorkspace(currentWorkspace.id, name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setName(currentWorkspace?.name || "");
    }
  };

  const toggleMenu = () => {
    if (workspaces.length > 1) {
      setIsMenuOpen(!isMenuOpen);
    }
  };

  if (!currentWorkspace) return null;

  return (
    <div className="workspace-name-container" ref={menuRef}>
      {isEditing ? (
        <input
          className="workspace-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <div
          className={`workspace-name-display ${workspaces.length > 1 ? 'has-dropdown' : ''} ${currentWorkspace.id === LOCAL_WORKSPACE_ID ? 'is-local' : ''} ${isMenuOpen ? 'workspace-dropdown-open' : ''}`}
          onDoubleClick={handleDoubleClick}
          onClick={toggleMenu}
          title={isAuthenticated && currentWorkspace.id !== LOCAL_WORKSPACE_ID ? "Double click to rename" : ""}
        >
          {currentWorkspace.name}
          {workspaces.length > 1 && <span className="dropdown-arrow">▼</span>}
        </div>
      )}

      {isMenuOpen && workspaces.length > 1 && (
        <div className="workspace-dropdown">
          {workspaces.map(w => (
            <div
              key={w.id}
              className={`workspace-dropdown-item ${w.id === currentWorkspace.id ? 'active' : ''}`}
              onClick={() => {
                selectWorkspace(w.id);
                setIsMenuOpen(false);
              }}
            >
              {w.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
