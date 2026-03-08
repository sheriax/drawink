/**
 * Feature Gate Component
 * Conditionally renders children based on subscription tier
 * Shows upgrade prompt if user doesn't have access
 */

import type React from "react";
import { useFeatureAccess } from "../hooks/useSubscription";
import UpgradeBanner from "./UpgradeBanner";

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  customMessage?: string;
}

const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  customMessage,
}) => {
  const { hasAccess, reason } = useFeatureAccess(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access
  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return <UpgradeBanner feature={feature} message={customMessage || reason} />;
  }

  // Don't render anything
  return null;
};

export default FeatureGate;
