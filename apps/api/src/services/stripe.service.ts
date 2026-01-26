/**
 * Stripe Service
 * Handles all Stripe operations: checkout, subscriptions, webhooks
 */

import Stripe from 'stripe';
import { adminDb } from '../firebase';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Pricing tiers with Stripe price IDs
 * These should match the products/prices created in Stripe Dashboard
 */
export const PRICING_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    stripePriceId: null, // Free tier has no Stripe price
    features: [
      '30 AI receipt scans per month',
      '3 connected accounts',
      '1 year transaction history',
      'Basic insights',
      'Limited AI chat (10 questions/month)',
    ],
  },
  pro: {
    name: 'Pro',
    price: 249, // ₹249/month
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO!,
    features: [
      'Unlimited AI scans',
      'Unlimited accounts',
      'Lifetime transaction history',
      'Advanced insights and wound detection',
      'Unlimited AI chat',
      'Priority support',
      'Export capabilities',
    ],
  },
  team: {
    name: 'Team',
    price: 999, // ₹999/month (placeholder, adjust as needed)
    stripePriceId: process.env.STRIPE_PRICE_ID_TEAM!,
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Organization workspace',
      'Project folders',
      'Team activity feed',
      'Admin controls',
      'Priority support',
    ],
  },
};

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession(
  userId: string,
  tier: 'pro' | 'team',
  successUrl: string,
  cancelUrl: string
) {
  // Get or create Stripe customer
  const customer = await getOrCreateCustomer(userId);

  // Get price ID for the tier
  const priceId = PRICING_TIERS[tier].stripePriceId;

  if (!priceId) {
    throw new Error(`No Stripe price ID configured for tier: ${tier}`);
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      tier,
    },
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Create a Stripe billing portal session
 * Allows users to manage their subscription (cancel, update payment method, etc.)
 */
export async function createPortalSession(userId: string, returnUrl: string) {
  // Get user's Stripe customer ID
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userData = userDoc.data();

  if (!userData?.subscription?.stripeCustomerId) {
    throw new Error('User has no Stripe customer ID');
  }

  // Create portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: userData.subscription.stripeCustomerId,
    return_url: returnUrl,
  });

  return {
    url: session.url,
  };
}

/**
 * Get or create a Stripe customer for a user
 */
async function getOrCreateCustomer(userId: string): Promise<Stripe.Customer> {
  // Check if user already has a Stripe customer ID
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userData = userDoc.data();

  if (userData?.subscription?.stripeCustomerId) {
    // Retrieve existing customer
    const customer = await stripe.customers.retrieve(
      userData.subscription.stripeCustomerId
    );

    if (!customer.deleted) {
      return customer as Stripe.Customer;
    }
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: userData?.email,
    metadata: {
      userId,
    },
  });

  // Save customer ID to Firestore
  await adminDb.collection('users').doc(userId).update({
    'subscription.stripeCustomerId': customer.id,
  });

  return customer;
}

/**
 * Get subscription details for a user
 */
export async function getSubscription(userId: string) {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userData = userDoc.data();

  if (!userData?.subscription?.stripeSubscriptionId) {
    return {
      tier: 'free',
      status: 'active',
      currentPeriodEnd: null,
    };
  }

  // Retrieve subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(
    userData.subscription.stripeSubscriptionId
  );

  return {
    tier: userData.subscription.tier,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

/**
 * Cancel a subscription (at period end)
 */
export async function cancelSubscription(userId: string) {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userData = userDoc.data();

  if (!userData?.subscription?.stripeSubscriptionId) {
    throw new Error('User has no active subscription');
  }

  // Cancel subscription at period end
  const subscription = await stripe.subscriptions.update(
    userData.subscription.stripeSubscriptionId,
    {
      cancel_at_period_end: true,
    }
  );

  return {
    cancelAt: subscription.cancel_at,
  };
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
  }
}

/**
 * Handle successful checkout
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as 'pro' | 'team';

  if (!userId || !tier) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  // Update user in Firestore
  await adminDb.collection('users').doc(userId).update({
    'subscription.tier': tier,
    'subscription.stripeCustomerId': session.customer,
    'subscription.stripeSubscriptionId': subscription.id,
    'subscription.expiresAt': new Date(subscription.current_period_end * 1000),
  });

  console.log(`Subscription activated for user ${userId}: ${tier}`);
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    // Find user by customer ID
    const usersSnapshot = await adminDb
      .collection('users')
      .where('subscription.stripeCustomerId', '==', subscription.customer)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error('User not found for subscription:', subscription.id);
      return;
    }

    const userDoc = usersSnapshot.docs[0];

    // Update subscription
    await userDoc.ref.update({
      'subscription.expiresAt': new Date(subscription.current_period_end * 1000),
    });

    // Check if subscription is being cancelled
    if (subscription.cancel_at_period_end) {
      console.log(`Subscription will cancel at period end: ${userDoc.id}`);
    }
  }
}

/**
 * Handle subscription deletion (downgrade to free)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Find user by customer ID
  const usersSnapshot = await adminDb
    .collection('users')
    .where('subscription.stripeCustomerId', '==', subscription.customer)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.error('User not found for subscription:', subscription.id);
    return;
  }

  const userDoc = usersSnapshot.docs[0];

  // Downgrade to free tier
  await userDoc.ref.update({
    'subscription.tier': 'free',
    'subscription.stripeSubscriptionId': null,
    'subscription.expiresAt': null,
  });

  console.log(`User downgraded to free tier: ${userDoc.id}`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`Payment succeeded for invoice: ${invoice.id}`);
  // Add any additional logic (e.g., send receipt email)
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.error(`Payment failed for invoice: ${invoice.id}`);
  // Add logic to notify user, retry payment, etc.
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
