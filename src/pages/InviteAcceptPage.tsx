/**
 * Invite Accept Page
 *
 * Handles /invite/accept?token=... links from invitation emails.
 * Shows invitation details, allows accept/decline, handles auth redirect.
 */

import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  useUser,
} from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import "./InviteAcceptPage.scss";

const InviteContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const { user } = useUser();

  const invitation = useQuery(api.invitations.getByToken, { token });
  const acceptMut = useMutation(api.invitations.acceptInvitation);
  const declineMut = useMutation(api.invitations.declineInvitation);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  if (!token) {
    return (
      <div className="invite-page">
        <div className="invite-page__card">
          <h2>Invalid Link</h2>
          <p>This invitation link is missing a token.</p>
          <button className="invite-page__btn" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (invitation === undefined) {
    return (
      <div className="invite-page">
        <div className="invite-page__card">
          <div className="invite-page__spinner" />
          <p>Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (invitation === null) {
    return (
      <div className="invite-page">
        <div className="invite-page__card">
          <h2>Invitation Not Found</h2>
          <p>This invitation link may be invalid or has been revoked.</p>
          <button className="invite-page__btn" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (invitation.status !== "pending") {
    return (
      <div className="invite-page">
        <div className="invite-page__card">
          <h2>Invitation {invitation.status}</h2>
          <p>This invitation has already been {invitation.status}.</p>
          <button className="invite-page__btn" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (invitation.expiresAt < Date.now()) {
    return (
      <div className="invite-page">
        <div className="invite-page__card">
          <h2>Invitation Expired</h2>
          <p>This invitation has expired. Please ask the workspace owner to send a new one.</p>
          <button className="invite-page__btn" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (done === "accepted") {
    return (
      <div className="invite-page">
        <div className="invite-page__card">
          <div className="invite-page__check">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6965db" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
          </div>
          <h2>You're in!</h2>
          <p>You've joined <strong>{invitation.workspaceName}</strong>.</p>
          <button className="invite-page__btn invite-page__btn--primary" onClick={() => navigate("/dashboard")}>
            Open Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (done === "declined") {
    return (
      <div className="invite-page">
        <div className="invite-page__card">
          <h2>Invitation Declined</h2>
          <p>You've declined the invitation to {invitation.workspaceName}.</p>
          <button className="invite-page__btn" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      const workspaceId = await acceptMut({ token });
      localStorage.setItem("selectedWorkspaceId", workspaceId);
      setDone("accepted");
    } catch (err: any) {
      const raw: string = err.data || err.message || "Failed to accept invitation";
      const match = raw.match(/Uncaught Error:\s*(.+?)(?:\.\s*at\s|$)/);
      setError(match ? match[1].trim() : raw);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await declineMut({ token });
      setDone("declined");
    } catch {
      setError("Failed to decline invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="invite-page">
      <div className="invite-page__card">
        <div className="invite-page__icon">
          {invitation.workspaceIcon || (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6965db" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          )}
        </div>

        <h2>Join {invitation.workspaceName}</h2>
        <p>
          <strong>{invitation.inviterName}</strong> invited{" "}
          <strong>{invitation.email}</strong> to join as a <strong>{invitation.role}</strong>.
        </p>

        {user && user.primaryEmailAddress?.emailAddress?.toLowerCase() !== invitation.email && (
          <div className="invite-page__warning">
            You're signed in as <strong>{user.primaryEmailAddress?.emailAddress}</strong>, but this
            invitation was sent to <strong>{invitation.email}</strong>.
          </div>
        )}

        {error && <div className="invite-page__error">{error}</div>}

        <div className="invite-page__actions">
          <button
            className="invite-page__btn invite-page__btn--primary"
            onClick={handleAccept}
            disabled={loading}
          >
            {loading ? "Joining..." : "Accept & Join"}
          </button>
          <button
            className="invite-page__btn invite-page__btn--ghost"
            onClick={handleDecline}
            disabled={loading}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export const InviteAcceptPage: React.FC = () => {
  return (
    <>
      <SignedIn>
        <InviteContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};
