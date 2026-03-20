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
 * Usage tracking — reads real AI usage from Convex.
 * Unlimited for team/beta users, 30 requests/month for free tier.
 */
export function useFeatureUsage(feature: string) {
  const { hasFullAccess } = useSubscription();
  const aiUsage = useQuery(api.aiUsage.getUsage);

  if (hasFullAccess) {
    return {
      limit: Number.POSITIVE_INFINITY,
      used: aiUsage?.monthlyTokensUsed ?? 0,
      remaining: Number.POSITIVE_INFINITY,
      percentage: 0,
      isLimitReached: false,
      isApproachingLimit: false,
    };
  }

  const limit = feature === "ai" ? 30 : 0;
  const used = aiUsage?.monthlyTokensUsed ?? 0;
  const remaining = Math.max(0, limit - used);
  const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;

  return {
    limit,
    used,
    remaining,
    percentage,
    isLimitReached: remaining <= 0,
    isApproachingLimit: percentage >= 80 && remaining > 0,
  };
}
