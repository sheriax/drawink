interface ProBadgeProps {
  tier?: "pro" | "team";
}

export const ProBadge: React.FC<ProBadgeProps> = ({ tier = "pro" }) => {
  return (
    <span className="drawink-dashboard__pro-badge">
      {tier === "team" ? "TEAM" : "PRO"}
    </span>
  );
};
