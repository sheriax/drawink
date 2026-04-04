interface Collaborator {
  userId: string;
  userName: string;
  userPhotoUrl?: string;
}

interface CollaboratorAvatarsProps {
  collaborators: Collaborator[];
  showAvatars: boolean; // false for free tier (shows count only)
}

export const CollaboratorAvatars: React.FC<CollaboratorAvatarsProps> = ({
  collaborators,
  showAvatars,
}) => {
  if (collaborators.length === 0) return null;

  if (!showAvatars) {
    return (
      <span className="drawink-dashboard__collab-count">
        {collaborators.length} active
      </span>
    );
  }

  const visible = collaborators.slice(0, 3);
  const overflow = collaborators.length - 3;

  return (
    <div className="drawink-dashboard__collab-avatars">
      {visible.map((c) => (
        <div key={c.userId} className="drawink-dashboard__collab-avatar" title={c.userName}>
          {c.userPhotoUrl ? (
            <img src={c.userPhotoUrl} alt={c.userName} />
          ) : (
            <span>{c.userName.charAt(0).toUpperCase()}</span>
          )}
          <span className="drawink-dashboard__collab-dot" />
        </div>
      ))}
      {overflow > 0 && (
        <span className="drawink-dashboard__collab-more">+{overflow}</span>
      )}
    </div>
  );
};
