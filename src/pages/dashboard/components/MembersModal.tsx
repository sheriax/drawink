import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface MembersModalProps {
  workspaceId: Id<"workspaces">;
  workspaceName: string;
  currentUserId: string;
  onClose: () => void;
}

type InviteRole = "admin" | "member" | "viewer";

const ROLE_OPTIONS: { value: InviteRole; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "viewer", label: "Viewer" },
];

const RoleDropdown: React.FC<{
  value: InviteRole;
  onChange: (role: InviteRole) => void;
  compact?: boolean;
}> = ({ value, onChange, compact }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right });
    }
    setOpen(!open);
  };

  const current = ROLE_OPTIONS.find((o) => o.value === value)!;

  return (
    <div className={`drawink-dashboard__role-dropdown${compact ? " drawink-dashboard__role-dropdown--compact" : ""}`} ref={ref}>
      <button
        ref={triggerRef}
        className="drawink-dashboard__role-dropdown-trigger"
        onClick={handleOpen}
        type="button"
      >
        {current.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          className="drawink-dashboard__role-dropdown-menu"
          style={{ position: "fixed", top: menuPos.top, left: menuPos.left, transform: "translateX(-100%)" }}
        >
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`drawink-dashboard__role-dropdown-item${opt.value === value ? " drawink-dashboard__role-dropdown-item--active" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.value === value && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const MembersModal: React.FC<MembersModalProps> = ({
  workspaceId,
  workspaceName,
  currentUserId,
  onClose,
}) => {
  const members = useQuery(api.workspaces.getMembers, { workspaceId });
  const pendingInvitations = useQuery(api.invitations.listPendingForWorkspace, { workspaceId });
  const createInvitation = useMutation(api.invitations.createInvitation);
  const revokeInvitation = useMutation(api.invitations.revokeInvitation);
  const updateMemberRole = useMutation(api.workspaces.updateMemberRole);
  const removeMemberMut = useMutation(api.workspaces.removeMember);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const currentMember = members?.find((m) => m.userId === currentUserId);
  const isOwner = currentMember?.role === "owner";
  const isAdminOrOwner = isOwner || currentMember?.role === "admin";

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      await createInvitation({ workspaceId, email, role: inviteRole });
      setInviteEmail("");
      setInviteSuccess(`Invitation sent to ${email}`);
      setTimeout(() => setInviteSuccess(null), 4000);
    } catch (err: any) {
      const raw: string = err.data || err.message || "Failed to send invitation";
      const match = raw.match(/Uncaught Error:\s*(.+?)(?:\.\s*at\s|$)/);
      setInviteError(match ? match[1].trim() : raw);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: InviteRole) => {
    try {
      await updateMemberRole({ workspaceId, userId, role });
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeMemberMut({ workspaceId, userId });
      if (userId === currentUserId) onClose();
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  const handleRevoke = async (invitationId: Id<"workspaceInvitations">) => {
    try {
      await revokeInvitation({ invitationId });
    } catch (err) {
      console.error("Failed to revoke invitation:", err);
    }
  };

  return (
    <div className="drawink-dashboard__modal-overlay" onClick={onClose}>
      <div
        className="drawink-dashboard__members-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="drawink-dashboard__members-header">
          <h3>{workspaceName} — Members</h3>
          <button onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Invite form */}
        {isAdminOrOwner && (
          <div className="drawink-dashboard__members-invite">
            <div className="drawink-dashboard__members-invite-row">
              <input
                className="drawink-dashboard__members-invite-input"
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
              <RoleDropdown value={inviteRole} onChange={setInviteRole} />
              <button
                className="drawink-dashboard__members-invite-btn"
                onClick={handleInvite}
                disabled={inviteLoading || !inviteEmail.trim()}
              >
                {inviteLoading ? "Sending..." : "Invite"}
              </button>
            </div>
            {inviteError && (
              <div className="drawink-dashboard__members-invite-error">{inviteError}</div>
            )}
            {inviteSuccess && (
              <div className="drawink-dashboard__members-invite-success">{inviteSuccess}</div>
            )}
          </div>
        )}

        {/* Pending invitations */}
        {isAdminOrOwner && pendingInvitations && pendingInvitations.length > 0 && (
          <div className="drawink-dashboard__members-pending">
            <div className="drawink-dashboard__members-pending-label">
              Pending Invitations
            </div>
            {pendingInvitations.map((inv) => (
              <div key={inv._id} className="drawink-dashboard__members-row drawink-dashboard__members-row--pending">
                <div className="drawink-dashboard__members-avatar drawink-dashboard__members-avatar--pending">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <path d="M22 6l-10 7L2 6" />
                  </svg>
                </div>
                <div className="drawink-dashboard__members-info">
                  <span className="drawink-dashboard__members-name">{inv.email}</span>
                  <span className="drawink-dashboard__members-email">
                    Invited as {inv.role} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="drawink-dashboard__members-actions">
                  <button
                    title="Revoke invitation"
                    onClick={() => handleRevoke(inv._id)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Member list */}
        <div className="drawink-dashboard__members-list">
          {!members && (
            <div className="drawink-dashboard__members-empty">Loading...</div>
          )}
          {members?.length === 0 && (
            <div className="drawink-dashboard__members-empty">No members yet</div>
          )}
          {members?.map((member) => {
            const isSelf = member.userId === currentUserId;
            const isMemberOwner = member.role === "owner";

            return (
              <div key={member._id} className="drawink-dashboard__members-row">
                <div className="drawink-dashboard__members-avatar">
                  {member.user?.photoUrl ? (
                    <img src={member.user.photoUrl} alt="" />
                  ) : (
                    (member.user?.name?.[0] || "?").toUpperCase()
                  )}
                </div>

                <div className="drawink-dashboard__members-info">
                  <span className="drawink-dashboard__members-name">
                    {member.user?.name || "Unknown"}
                    {isSelf && (
                      <span className="drawink-dashboard__members-you-badge"> (you)</span>
                    )}
                  </span>
                  <span className="drawink-dashboard__members-email">
                    {member.user?.email || ""}
                  </span>
                </div>

                <div className="drawink-dashboard__members-role">
                  {isMemberOwner ? (
                    <span className="drawink-dashboard__members-role-badge">Owner</span>
                  ) : isOwner ? (
                    <RoleDropdown
                      value={member.role as InviteRole}
                      onChange={(role) => handleRoleChange(member.userId, role)}
                      compact
                    />
                  ) : (
                    <span className="drawink-dashboard__members-role-badge">
                      {member.role}
                    </span>
                  )}
                </div>

                <div className="drawink-dashboard__members-actions">
                  {isOwner && !isMemberOwner && (
                    <button
                      title="Remove member"
                      onClick={() => handleRemove(member.userId)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {isSelf && !isMemberOwner && (
                    <button
                      title="Leave workspace"
                      onClick={() => handleRemove(member.userId)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
