import { useNavigate } from "react-router-dom";
import { useFeatureUsage, useIsFreeTier } from "@/hooks/useSubscription";

export const AiUsageMeter: React.FC = () => {
  const navigate = useNavigate();
  const isFree = useIsFreeTier();
  const usage = useFeatureUsage("ai");

  const getBarColor = () => {
    if (usage.percentage >= 80) return "var(--dash-danger)";
    if (usage.percentage >= 60) return "#fb8c00";
    return "#43a047";
  };

  return (
    <div className="drawink-dashboard__ai-meter">
      <div className="drawink-dashboard__ai-meter-header">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27A7 7 0 0 1 7.27 19H6a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h-1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
        </svg>
        <span className="drawink-dashboard__ai-meter-label">AI Requests</span>
      </div>
      {!isFree ? (
        <div className="drawink-dashboard__ai-meter-unlimited">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#43a047" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Unlimited
        </div>
      ) : (
        <>
          <div className="drawink-dashboard__ai-bar-track">
            <div
              className="drawink-dashboard__ai-bar-fill"
              style={{
                width: `${Math.min(usage.percentage, 100)}%`,
                background: getBarColor(),
              }}
            />
          </div>
          <div className="drawink-dashboard__ai-meter-stats">
            <span>
              {usage.used}/{usage.limit} used
            </span>
            {usage.isApproachingLimit && (
              <button
                className="drawink-dashboard__ai-upgrade-link"
                onClick={() => navigate("/billing")}
              >
                Upgrade
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
