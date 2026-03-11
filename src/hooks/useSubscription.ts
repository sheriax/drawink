/**
 * useSubscription Hook
 * Provides subscription status and feature gating utilities.
 * Reads the real tier from Convex. Beta users (isBetaUser: true) get
 * full team-equivalent access regardless of their subscriptionTier.
 */

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

type SubscriptionTier = "free" | "pro" | "team";

interface SubscriptionStatus {
  tier: SubscriptionTier;
  isBetaUser: boolean;
  hasFullAccess: boolean;
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
 * Hook to get current subscription status.
 * hasFullAccess is true for team tier users and beta users.
 */
export function useSubscription(): SubscriptionStatus {
  const user = useQuery(api.users.getCurrent);
  const isLoading = user === undefined;

  if (isLoading) {
    return {
      tier: "free",
      isBetaUser: false,
      hasFullAccess: false,
      status: "loading",
      currentPeriodEnd: null,
      isLoading: true,
      error: null,
    };
  }

  if (!user) {
    return {
      tier: "free",
      isBetaUser: false,
      hasFullAccess: false,
      status: "unauthenticated",
      currentPeriodEnd: null,
      isLoading: false,
      error: null,
    };
  }

  const tier = user.subscriptionTier;
  const isBetaUser = user.isBetaUser === true;

  return {
    tier,
    isBetaUser,
    hasFullAccess: tier === "team" || isBetaUser,
    status: "active",
    currentPeriodEnd: user.subscriptionExpiresAt ?? null,
    isLoading: false,
    error: null,
  };
}

/**
 * Hook to check if user has access to a specific feature.
 * Returns true for team tier or beta users.
 */
export function useFeatureAccess(feature: string | SubscriptionTier): FeatureAccess {
  const { hasFullAccess } = useSubscription();
  return { hasAccess: hasFullAccess };
}

/**
 * Hook to check if user is on free tier (no beta access).
 */
export function useIsFreeTier(): boolean {
  const { tier, isBetaUser } = useSubscription();
  return tier === "free" && !isBetaUser;
}

/**
 * Hook to check if user is on pro or higher tier (includes beta).
 */
export function useIsProTier(): boolean {
  const { tier, isBetaUser } = useSubscription();
  return tier === "pro" || tier === "team" || isBetaUser;
}

/**
 * Hook to check if user is on team tier (includes beta).
 */
export function useIsTeamTier(): boolean {
  const { tier, isBetaUser } = useSubscription();
  return tier === "team" || isBetaUser;
}

/**
 * Usage tracking — unlimited for team/beta users, zero limits for free tier.
 */
export function useFeatureUsage(feature: string) {
  const { hasFullAccess } = useSubscription();
  return {
    limit: hasFullAccess ? Number.POSITIVE_INFINITY : 0,
    used: 0,
    remaining: hasFullAccess ? Number.POSITIVE_INFINITY : 0,
    percentage: 0,
    isLimitReached: !hasFullAccess,
    isApproachingLimit: false,
  };
}
