/**
 * useSubscription Hook
 * Provides subscription status and feature gating utilities
 *
 * All users currently have team tier access - no billing backend needed.
 */

type SubscriptionTier = "free" | "pro" | "team";

interface SubscriptionStatus {
  tier: SubscriptionTier;
  status: string;
  currentPeriodEnd: number | null;
  isLoading: boolean;
  error: string | null;
}

interface FeatureAccess {
  hasAccess: boolean;
  reason?: string;
}

/**
 * Hook to get current subscription status
 * All users have team tier access - returns static values
 */
export function useSubscription(): SubscriptionStatus {
  return {
    tier: "team",
    status: "active",
    currentPeriodEnd: null,
    isLoading: false,
    error: null,
  };
}

/**
 * Hook to check if user has access to a specific feature
 */
export function useFeatureAccess(feature: string | SubscriptionTier): FeatureAccess {
  return { hasAccess: true };
}

/**
 * Hook to check if user is on free tier
 */
export function useIsFreeTier(): boolean {
  return false;
}

/**
 * Hook to check if user is on pro or higher tier
 */
export function useIsProTier(): boolean {
  return true;
}

/**
 * Hook to check if user is on team tier
 */
export function useIsTeamTier(): boolean {
  return true;
}

/**
 * Usage tracking for free tier limits
 * All features are unlimited
 */
export function useFeatureUsage(feature: string) {
  return {
    limit: Number.POSITIVE_INFINITY,
    used: 0,
    remaining: Number.POSITIVE_INFINITY,
    percentage: 0,
    isLimitReached: false,
    isApproachingLimit: false,
  };
}
