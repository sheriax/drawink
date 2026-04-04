import { useNavigate } from "react-router-dom";

interface UpgradePromptProps {
  tier: "pro" | "team";
  feature: string;
  onClose: () => void;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  tier,
  feature,
  onClose,
}) => {
  const navigate = useNavigate();

  return (
    <div className="drawink-dashboard__modal-overlay" onClick={onClose}>
      <div
        className="drawink-dashboard__modal drawink-dashboard__upgrade-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Upgrade to {tier === "team" ? "Team" : "Pro"}</h3>
        <p>{feature}</p>
        <div className="drawink-dashboard__modal-actions">
          <button className="drawink-dashboard__modal-cancel" onClick={onClose}>
            Not now
          </button>
          <button
            className="drawink-dashboard__upgrade-btn"
            onClick={() => navigate("/billing")}
          >
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
};
