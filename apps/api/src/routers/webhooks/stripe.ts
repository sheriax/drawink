/**
 * Stripe Webhook Handler
 * Receives and processes Stripe webhook events
 */

import { Hono } from 'hono';
import { verifyWebhookSignature, handleWebhookEvent } from '../../services/stripe.service';

const stripeWebhook = new Hono();

/**
 * Stripe webhook endpoint
 * POST /webhooks/stripe
 */
stripeWebhook.post('/', async (c) => {
  try {
    // Get raw body (required for Stripe signature verification)
    const payload = await c.req.text();
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      return c.json({ error: 'Missing stripe-signature header' }, 400);
    }

    // Verify webhook signature
    let event;
    try {
      event = verifyWebhookSignature(payload, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // Log event
    console.log(`[Stripe Webhook] Received event: ${event.type}`, {
      id: event.id,
      created: new Date(event.created * 1000).toISOString(),
    });

    // Handle event
    await handleWebhookEvent(event);

    // Return success response
    return c.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing webhook:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

export default stripeWebhook;
