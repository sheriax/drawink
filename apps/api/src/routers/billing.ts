/**
 * Billing Router
 * Handles subscription management via Stripe
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import * as stripeService from '../services/stripe.service';

export const billingRouter = router({
  /**
   * Get available pricing tiers
   * Public endpoint - anyone can view pricing
   */
  getPricingTiers: publicProcedure.query(() => {
    return stripeService.PRICING_TIERS;
  }),

  /**
   * Get current user's subscription
   * Protected endpoint - requires authentication
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    return await stripeService.getSubscription(ctx.userId);
  }),

  /**
   * Create Stripe checkout session
   * Protected endpoint - requires authentication
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        tier: z.enum(['pro', 'team']),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await stripeService.createCheckoutSession(
        ctx.userId,
        input.tier,
        input.successUrl,
        input.cancelUrl
      );
    }),

  /**
   * Create Stripe billing portal session
   * Protected endpoint - requires authentication
   * Allows users to manage subscription, update payment method, etc.
   */
  createPortalSession: protectedProcedure
    .input(
      z.object({
        returnUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await stripeService.createPortalSession(ctx.userId, input.returnUrl);
    }),

  /**
   * Cancel subscription (at period end)
   * Protected endpoint - requires authentication
   */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    return await stripeService.cancelSubscription(ctx.userId);
  }),
});
