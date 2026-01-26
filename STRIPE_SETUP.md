# Stripe Setup Guide for Drawink

**Status**: Ready to configure
**Priority**: High (billing system implemented, needs Stripe configuration)

## Current Status

✅ **Complete**:
- Stripe integration code implemented (Phase 4)
- Environment variables centralized
- All Stripe keys present in `.env.local` (test mode)
- Webhook handler ready at `/webhooks/stripe`
- Billing UI complete (pricing page, billing settings)

⏳ **Pending**:
- Create products in Stripe Dashboard
- Update price IDs in `.env.local`
- Configure webhook endpoint
- Test the full billing flow

## Step-by-Step Setup

### 1. Access Stripe Dashboard

```bash
# Open Stripe Dashboard
open https://dashboard.stripe.com

# Use test mode for development (toggle in top-left)
```

Your test API keys are already in `.env.local`:
```bash
STRIPE_SECRET_KEY=sk_test_51NUhU9JsSFUyRsdk18tFgr3EnUO60JCWB9tYS5kcQ0KJdtnW7ay1Ybr8VXL4CmFh6KMohHazcfuuc63C4dQRCa7I00sQq5jmSp
STRIPE_PUBLISHABLE_KEY=pk_test_51NUhU9JsSFUyRsdksrbpIuRMEFhzPPqHlqQ2hH3TSM5IU7MFRzfw7HCnpmt5mwHrPuLC51nQmnYUP3OmLCfZuBGI006fCGnbpM
```

### 2. Create Products

#### Pro Tier (₹249/month)

1. Go to: **Products** → **Add Product**
2. Fill in:
   - **Name**: Drawink Pro
   - **Description**: Unlimited canvases, layers, and collaboration features
   - **Image**: Upload Drawink logo
3. Add pricing:
   - **Pricing model**: Standard pricing
   - **Price**: ₹249.00 INR
   - **Billing period**: Monthly (Recurring)
4. Click **Save product**
5. Copy the **Price ID** (starts with `price_...`)
6. Update `.env.local`:
   ```bash
   STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxxxx  # Replace with your price ID
   ```

#### Team Tier (₹999/month)

1. Go to: **Products** → **Add Product**
2. Fill in:
   - **Name**: Drawink Team
   - **Description**: Pro features + team collaboration and priority support
   - **Image**: Upload Drawink logo
3. Add pricing:
   - **Pricing model**: Standard pricing
   - **Price**: ₹999.00 INR
   - **Billing period**: Monthly (Recurring)
4. Click **Save product**
5. Copy the **Price ID** (starts with `price_...`)
6. Update `.env.local`:
   ```bash
   STRIPE_PRICE_ID_TEAM=price_xxxxxxxxxxxxxxx  # Replace with your price ID
   ```

### 3. Configure Webhook (Local Testing)

For local development, use Stripe CLI:

```bash
# Install Stripe CLI (if not installed)
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/webhooks/stripe

# This will output a webhook signing secret (whsec_...)
# Copy it and update .env.local:
# STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxx
```

**Important Events** (automatically handled by the webhook):
- `checkout.session.completed` - User completed checkout
- `customer.subscription.created` - Subscription created
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_succeeded` - Payment succeeded
- `invoice.payment_failed` - Payment failed

### 4. Configure Webhook (Production)

When deploying to production:

1. Go to: **Developers** → **Webhooks** → **Add endpoint**
2. Fill in:
   - **Endpoint URL**: `https://api.drawink.app/webhooks/stripe`
   - **Description**: Drawink Production Webhook
   - **Events to send**: Select these events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
3. Click **Add endpoint**
4. Copy the **Signing secret** (starts with `whsec_...`)
5. Update production environment with:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxx
   ```

### 5. Test the Billing Flow

#### Start Development Servers

```bash
# Terminal 1: Start all services
bun run dev

# Terminal 2: Start Stripe webhook forwarding
stripe listen --forward-to localhost:3001/webhooks/stripe

# Terminal 3: Watch API logs
cd apps/api && bun run dev
```

#### Test Checkout Flow

1. **Visit Pricing Page**:
   ```bash
   open http://localhost:4321/pricing
   ```

2. **Click "Upgrade to Pro"**:
   - Should redirect to Stripe Checkout
   - Clerk auth required (sign in/up)
   - Organization must be selected

3. **Use Test Card**:
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

4. **Complete Payment**:
   - Should redirect back to `/billing`
   - Status should update to "Pro" or "Team"
   - Can manage subscription (cancel, update payment method)

#### Test Webhook Events

Check your terminal running `stripe listen` - you should see:
```
✅ checkout.session.completed
✅ customer.subscription.created
✅ invoice.payment_succeeded
```

#### Verify Database Updates

Check Firestore:
```bash
# Go to Firebase Console
open https://console.firebase.google.com

# Navigate to: Firestore Database > organizations > [org-id] > subscription
# Should see:
{
  "status": "active",
  "tier": "pro",
  "stripeCustomerId": "cus_...",
  "stripeSubscriptionId": "sub_...",
  "currentPeriodEnd": <timestamp>
}
```

### 6. Test Customer Portal

The customer portal allows users to:
- Update payment method
- View invoices
- Cancel subscription
- Update billing details

Test it:
1. Go to billing page: `http://localhost:3000/billing`
2. Click "Manage Subscription"
3. Should redirect to Stripe Customer Portal
4. Try updating payment method, viewing invoices, etc.

### 7. Test Subscription Limits (Feature Gates)

```typescript
// In your component
import { useFeatureAccess } from '@drawink/api/hooks/useFeatureAccess';

function MyComponent() {
  const { canAccessFeature, subscription } = useFeatureAccess();

  // Check specific features
  if (canAccessFeature('unlimited_canvases')) {
    // Show unlimited canvases
  } else {
    // Show upgrade banner
  }

  return (
    <div>
      <p>Current Tier: {subscription?.tier}</p>
      <UpgradeBanner />
    </div>
  );
}
```

Test different scenarios:
- ✅ Free user (no subscription)
- ✅ Pro user (active subscription)
- ✅ Team user (active subscription)
- ✅ Cancelled user (subscription ended)

### 8. Monitor Usage (Optional)

Implement usage tracking for free tier limits:

```typescript
// apps/api/src/services/usageTracker.ts
export async function trackCanvasCreation(userId: string) {
  const usage = await getMonthlyUsage(userId);
  const subscription = await getUserSubscription(userId);

  // Free tier: 10 canvases/month
  if (!subscription && usage.canvases >= 10) {
    throw new Error('Free tier limit reached. Upgrade to Pro for unlimited.');
  }

  // Increment usage
  await incrementUsage(userId, 'canvases');
}
```

## Troubleshooting

### Issue: "Invalid API Key"
**Solution**: Check that your API keys in `.env.local` match Stripe Dashboard

### Issue: "Webhook signature verification failed"
**Solution**:
- For local: Make sure `stripe listen` is running and webhook secret is updated
- For production: Check that webhook secret matches Stripe Dashboard

### Issue: "Price not found"
**Solution**: Check that `STRIPE_PRICE_ID_PRO` and `STRIPE_PRICE_ID_TEAM` match your Stripe Dashboard

### Issue: "CORS error"
**Solution**: Add your frontend URL to `ALLOWED_ORIGINS` in `.env.local`

### Issue: "Subscription not updating in database"
**Solution**: Check webhook logs in terminal and Firestore security rules

## Security Checklist

Before going to production:

- [ ] Move to Stripe live mode (not test mode)
- [ ] Update API keys in production environment
- [ ] Configure production webhook endpoint
- [ ] Test with real card (small amount)
- [ ] Set up webhook monitoring/alerts
- [ ] Review Stripe security best practices
- [ ] Enable 3D Secure (SCA) for European customers
- [ ] Set up email receipts in Stripe Dashboard
- [ ] Configure tax collection (if required)
- [ ] Review refund policy

## Next Steps

After Stripe is fully configured:

1. **Usage Tracking**: Implement free tier limits enforcement
2. **Analytics**: Add billing analytics to admin dashboard
3. **Email Notifications**: Set up subscription emails (trial ending, payment failed, etc.)
4. **Invoices**: Display invoices in billing settings
5. **Annual Billing**: Add annual plan options (save 20%)
6. **Discounts**: Implement coupon codes
7. **Team Seats**: Add seat-based pricing for Team tier

## Resources

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Testing Cards](https://stripe.com/docs/testing)
- [Stripe CLI Docs](https://stripe.com/docs/stripe-cli)
- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

## Quick Reference

```bash
# View test mode dashboard
open https://dashboard.stripe.com/test/dashboard

# Test checkout locally
open http://localhost:4321/pricing

# Test billing settings
open http://localhost:3000/billing

# View webhook logs
stripe logs tail --filter-events="checkout.session.completed,customer.subscription.*"

# Test webhook locally
stripe trigger checkout.session.completed
```

---

**Questions?** See [Phase 4 Completion](./docs/migration/PHASE_4_COMPLETION.md) for detailed implementation details.
