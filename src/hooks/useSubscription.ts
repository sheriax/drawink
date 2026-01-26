/**
 * useSubscription Hook
 * Provides subscription status and feature gating utilities
 */

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { trpc } from '../lib/trpc';

type SubscriptionTier = 'free' | 'pro' | 'team';

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
 */
export function useSubscription(): SubscriptionStatus {
  const { user, isLoaded } = useUser();
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    tier: 'free',
    status: 'active',
    currentPeriodEnd: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!isLoaded || !user) {
      setSubscription((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchSubscription = async () => {
      try {
        const data = await trpc.billing.getSubscription.query();
        setSubscription({
          ...data,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setSubscription((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load subscription',
        }));
      }
    };

    fetchSubscription();
  }, [isLoaded, user]);

  return subscription;
}

/**
 * Hook to check if user has access to a specific feature
 * @param feature - Feature identifier or minimum tier required
 */
export function useFeatureAccess(feature: string | SubscriptionTier): FeatureAccess {
  const subscription = useSubscription();

  // Feature-specific access rules
  const FEATURE_REQUIREMENTS: Record<string, SubscriptionTier> = {
    'unlimited-scans': 'pro',
    'unlimited-accounts': 'pro',
    'lifetime-history': 'pro',
    'advanced-insights': 'pro',
    'unlimited-chat': 'pro',
    'priority-support': 'pro',
    'export': 'pro',
    'team-collaboration': 'team',
    'organization': 'team',
    'projects': 'team',
    'team-activity': 'team',
    'admin-controls': 'team',
  };

  // Determine required tier
  const requiredTier: SubscriptionTier =
    typeof feature === 'string' && feature in FEATURE_REQUIREMENTS
      ? FEATURE_REQUIREMENTS[feature]
      : (feature as SubscriptionTier);

  // Check access
  const tierHierarchy: Record<SubscriptionTier, number> = {
    free: 0,
    pro: 1,
    team: 2,
  };

  const userTierLevel = tierHierarchy[subscription.tier];
  const requiredTierLevel = tierHierarchy[requiredTier];

  const hasAccess = userTierLevel >= requiredTierLevel;

  if (hasAccess) {
    return { hasAccess: true };
  }

  // Generate helpful message
  const tierNames: Record<SubscriptionTier, string> = {
    free: 'Free',
    pro: 'Pro',
    team: 'Team',
  };

  return {
    hasAccess: false,
    reason: `This feature requires ${tierNames[requiredTier]} plan`,
  };
}

/**
 * Hook to check if user is on free tier
 */
export function useIsFreeTier(): boolean {
  const subscription = useSubscription();
  return subscription.tier === 'free';
}

/**
 * Hook to check if user is on pro or higher tier
 */
export function useIsProTier(): boolean {
  const subscription = useSubscription();
  return subscription.tier === 'pro' || subscription.tier === 'team';
}

/**
 * Hook to check if user is on team tier
 */
export function useIsTeamTier(): boolean {
  const subscription = useSubscription();
  return subscription.tier === 'team';
}

/**
 * Usage tracking for free tier limits
 */
export function useFeatureUsage(feature: string) {
  const subscription = useSubscription();

  // Feature limits for free tier
  const FREE_TIER_LIMITS: Record<string, number> = {
    'ai-scans': 30, // per month
    'accounts': 3,
    'chat-questions': 10, // per month
  };

  // TODO: Implement usage tracking with Firestore
  // For now, return placeholder data
  const limit = FREE_TIER_LIMITS[feature] || 0;
  const used = 0; // TODO: Fetch from Firestore

  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    percentage: limit > 0 ? (used / limit) * 100 : 0,
    isLimitReached: used >= limit,
    isApproachingLimit: used / limit >= 0.8,
  };
}
