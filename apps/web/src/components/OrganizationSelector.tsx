/**
 * Organization Selector Component
 * Allows users to switch between their personal workspace and organizations
 */

import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useTRPC } from "../lib/trpc";
import type { Organization } from "@drawink/types";
import DropdownMenu from "@drawink/drawink/components/dropdownMenu/DropdownMenu";
import "./OrganizationSelector.scss";

interface OrganizationSelectorProps {
  onOrganizationChange?: (organizationId: string | null) => void;
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  onOrganizationChange,
}) => {
  const { user, isLoaded } = useUser();
  const trpc = useTRPC();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Load user's organizations
  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }

    const loadOrganizations = async () => {
      setIsLoading(true);
      try {
        const orgs = await trpc.organization.myOrganizations.query();
        setOrganizations(orgs);

        // Load selected org from localStorage
        const savedOrgId = localStorage.getItem("selectedOrganizationId");
        if (savedOrgId && savedOrgId !== "personal") {
          const saved = orgs.find((org) => org.id === savedOrgId);
          if (saved) {
            setSelectedOrg(saved);
          }
        }
      } catch (error) {
        console.error("Failed to load organizations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrganizations();
  }, [isLoaded, user]);

  const handleOrganizationSelect = (org: Organization | null) => {
    setSelectedOrg(org);
    setIsOpen(false);

    // Save to localStorage
    if (org) {
      localStorage.setItem("selectedOrganizationId", org.id);
    } else {
      localStorage.setItem("selectedOrganizationId", "personal");
    }

    // Notify parent component
    onOrganizationChange?.(org?.id || null);
  };

  // Don't show if user is not loaded or not signed in
  if (!isLoaded || !user) {
    return null;
  }

  const displayName = selectedOrg?.name || "Personal";

  return (
    <div className="organization-selector">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenu.Trigger className="organization-selector__trigger">
          <div className="organization-selector__current">
            <div className="organization-selector__icon">
              {selectedOrg ? (
                // Organization icon (first letter)
                <span className="organization-selector__org-icon">{selectedOrg.name[0].toUpperCase()}</span>
              ) : (
                // Personal workspace icon
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1a6 6 0 0 0-6 6h12a6 6 0 0 0-6-6z" />
                </svg>
              )}
            </div>
            <span className="organization-selector__name">{displayName}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="organization-selector__chevron">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content align="start" className="organization-selector__dropdown">
          {/* Personal workspace */}
          <DropdownMenu.Item
            onSelect={() => handleOrganizationSelect(null)}
            className={!selectedOrg ? "organization-selector__item--active" : ""}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1a6 6 0 0 0-6 6h12a6 6 0 0 0-6-6z" />
            </svg>
            <span>Personal</span>
          </DropdownMenu.Item>

          {/* Organizations */}
          {organizations.length > 0 && (
            <>
              <DropdownMenu.Separator />
              {organizations.map((org) => (
                <DropdownMenu.Item
                  key={org.id}
                  onSelect={() => handleOrganizationSelect(org)}
                  className={selectedOrg?.id === org.id ? "organization-selector__item--active" : ""}
                >
                  <span className="organization-selector__org-icon-small">{org.name[0].toUpperCase()}</span>
                  <span>{org.name}</span>
                </DropdownMenu.Item>
              ))}
            </>
          )}

          {/* Loading state */}
          {isLoading && (
            <>
              <DropdownMenu.Separator />
              <div className="organization-selector__loading">Loading...</div>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
};
