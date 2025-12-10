import React from "react";
import { useAuth } from "../auth";

import "./UserAvatar.scss";

export const UserAvatar: React.FC = () => {
  const { isAuthenticated, displayName, avatarUrl, signOut, loading } = useAuth();

  if (loading || !isAuthenticated) {
    return null;
  }

  const initials = displayName
    ? displayName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
    : "U";

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="user-avatar">
      <button className="user-avatar__button" title={displayName || "User"}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName || "User avatar"}
            className="user-avatar__image"
          />
        ) : (
          <span className="user-avatar__initials">{initials}</span>
        )}
      </button>
      <div className="user-avatar__dropdown">
        <div className="user-avatar__info">
          <span className="user-avatar__name">{displayName}</span>
        </div>
        <button className="user-avatar__signout" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
};

export default UserAvatar;
