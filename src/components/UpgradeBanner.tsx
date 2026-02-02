/**
 * Upgrade Banner Component
 * Displays upgrade prompts for free tier users
 */

import type React from "react";
import { useNavigate } from "react-router-dom";
import "./UpgradeBanner.scss";

interface UpgradeBannerProps {
  feature?: string;
  message?: string;
  compact?: boolean;
}

const UpgradeBanner: React.FC<UpgradeBannerProps> = ({ feature, message, compact = false }) => {
  const navigate = useNavigate();

  const defaultMessage = feature
    ? `Upgrade to Pro to unlock ${feature}`
    : "Upgrade to Pro for unlimited access to all features";

  return (
    <div className={`upgrade-banner ${compact ? "compact" : ""}`}>
      <div className="upgrade-banner-content">
        <div className="icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="message">
          <p>{message || defaultMessage}</p>
        </div>
        <button className="upgrade-button" onClick={() => navigate("/billing")}>
          Upgrade Now
        </button>
      </div>
    </div>
  );
};

export default UpgradeBanner;
