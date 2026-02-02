/**
 * Organization Selector Component
 * Allows users to switch between their personal workspace and organizations.
 * Uses Convex workspaces as the data source.
 */

import DropdownMenu from "@/core/components/dropdownMenu/DropdownMenu";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

interface OrganizationSelectorProps {
  onOrganizationChange?: (organizationId: string | null) => void;
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  onOrganizationChange,
}) => {
  const { user, isLoaded } = useUser();
  const workspaces = useQuery(api.workspaces.listMine);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    () => localStorage.getItem("selectedOrganizationId") || null,
  );
  const [isOpen, setIsOpen] = useState(false);

  if (!isLoaded || !user) {
    return null;
  }

  const selectedWorkspace = workspaces?.find((w) => w._id === selectedWorkspaceId);
  const displayName = selectedWorkspace?.name || "Personal";

  const handleSelect = (workspaceId: string | null) => {
    setSelectedWorkspaceId(workspaceId);
    setIsOpen(false);

    if (workspaceId) {
      localStorage.setItem("selectedOrganizationId", workspaceId);
    } else {
      localStorage.setItem("selectedOrganizationId", "personal");
    }

    onOrganizationChange?.(workspaceId);
  };

  return (
    <div className="organization-selector">
      <DropdownMenu open={isOpen}>
        <DropdownMenu.Trigger
          className="organization-selector__trigger"
          onToggle={() => setIsOpen(!isOpen)}
        >
          <div className="organization-selector__current">
            <div className="organization-selector__icon">
              {selectedWorkspace ? (
                <span className="organization-selector__org-icon">
                  {selectedWorkspace.name[0].toUpperCase()}
                </span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1a6 6 0 0 0-6 6h12a6 6 0 0 0-6-6z" />
                </svg>
              )}
            </div>
            <span className="organization-selector__name">{displayName}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="currentColor"
              className="organization-selector__chevron"
            >
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content
          onClickOutside={() => setIsOpen(false)}
          className="organization-selector__dropdown"
        >
          <DropdownMenu.Item
            onSelect={() => handleSelect(null)}
            className={!selectedWorkspace ? "organization-selector__item--active" : ""}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1a6 6 0 0 0-6 6h12a6 6 0 0 0-6-6z" />
            </svg>
            <span>Personal</span>
          </DropdownMenu.Item>

          {workspaces && workspaces.length > 0 && (
            <>
              <DropdownMenu.Separator />
              {workspaces.map((ws) => (
                <DropdownMenu.Item
                  key={ws._id}
                  onSelect={() => handleSelect(ws._id)}
                  className={
                    selectedWorkspaceId === ws._id ? "organization-selector__item--active" : ""
                  }
                >
                  <span className="organization-selector__org-icon-small">
                    {ws.name[0].toUpperCase()}
                  </span>
                  <span>{ws.name}</span>
                </DropdownMenu.Item>
              ))}
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
};
