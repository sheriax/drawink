import { useAuth } from "../auth";

export const DrawinkPlusPromoBanner = ({
  isSignedIn,
}: {
  isSignedIn: boolean;
}) => {
  const { isAuthenticated, openAuthDialog } = useAuth();

  // Only show for guests
  if (isAuthenticated || isSignedIn) {
    return null;
  }

  return (
    <button
      onClick={openAuthDialog}
      className="plus-banner"
      style={{
        background: "linear-gradient(135deg, #6965db 0%, #5753c9 100%)",
        color: "white",
        border: "none",
        padding: "0.5rem 1rem",
        borderRadius: "8px",
        fontSize: "0.875rem",
        fontWeight: 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.02)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(105, 101, 219, 0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      Sign in
    </button>
  );
};
