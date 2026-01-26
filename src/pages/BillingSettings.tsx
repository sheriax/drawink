/**
 * Billing Settings Page
 * Allows users to manage their subscription
 */

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { trpc } from '../lib/trpc';
import './BillingSettings.scss';

interface SubscriptionDetails {
  tier: 'free' | 'pro' | 'team';
  status: string;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd?: boolean;
}

const BillingSettings: React.FC = () => {
  const { user, isLoaded } = useUser();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch subscription details
  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchSubscription = async () => {
      try {
        const data = await trpc.billing.getSubscription.query();
        setSubscription(data);
      } catch (err) {
        setError('Failed to load subscription details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [isLoaded, user]);

  // Handle upgrade
  const handleUpgrade = async (tier: 'pro' | 'team') => {
    try {
      setLoading(true);
      const result = await trpc.billing.createCheckoutSession.mutate({
        tier,
        successUrl: `${window.location.origin}/billing/success`,
        cancelUrl: `${window.location.origin}/billing`,
      });

      // Redirect to Stripe checkout
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError('Failed to create checkout session');
      console.error(err);
      setLoading(false);
    }
  };

  // Handle manage subscription (Stripe portal)
  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      const result = await trpc.billing.createPortalSession.mutate({
        returnUrl: `${window.location.origin}/billing`,
      });

      // Redirect to Stripe portal
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError('Failed to open billing portal');
      console.error(err);
      setLoading(false);
    }
  };

  // Handle cancel subscription
  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    try {
      setLoading(true);
      await trpc.billing.cancelSubscription.mutate();
      alert('Your subscription has been cancelled. You will retain access until the end of your billing period.');
      window.location.reload();
    } catch (err) {
      setError('Failed to cancel subscription');
      console.error(err);
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="billing-settings">
        <div className="loading">Loading billing information...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="billing-settings">
        <div className="error">Please sign in to view billing settings</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="billing-settings">
        <div className="error">{error}</div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="billing-settings">
      <div className="container">
        <h1>Billing & Subscription</h1>

        {/* Current Plan */}
        <div className="current-plan">
          <h2>Current Plan</h2>
          <div className="plan-card">
            <div className="plan-header">
              <div className="plan-info">
                <h3>{subscription?.tier === 'free' ? 'Free' : subscription?.tier === 'pro' ? 'Pro' : 'Team'}</h3>
                {subscription?.tier === 'free' ? (
                  <p className="plan-price">₹0/month</p>
                ) : subscription?.tier === 'pro' ? (
                  <p className="plan-price">₹249/month</p>
                ) : (
                  <p className="plan-price">₹999/month</p>
                )}
              </div>
              <div className={`status-badge ${subscription?.status}`}>
                {subscription?.status || 'Active'}
              </div>
            </div>

            {subscription?.currentPeriodEnd && (
              <div className="plan-details">
                <p>
                  {subscription.cancelAtPeriodEnd
                    ? `Cancels on ${formatDate(subscription.currentPeriodEnd)}`
                    : `Renews on ${formatDate(subscription.currentPeriodEnd)}`}
                </p>
              </div>
            )}

            <div className="plan-actions">
              {subscription?.tier === 'free' && (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleUpgrade('pro')}
                  >
                    Upgrade to Pro
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleUpgrade('team')}
                  >
                    Upgrade to Team
                  </button>
                </>
              )}

              {subscription?.tier !== 'free' && (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={handleManageSubscription}
                  >
                    Manage Subscription
                  </button>
                  {!subscription?.cancelAtPeriodEnd && (
                    <button
                      className="btn btn-danger"
                      onClick={handleCancelSubscription}
                    >
                      Cancel Subscription
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Plan Comparison */}
        {subscription?.tier === 'free' && (
          <div className="plan-comparison">
            <h2>Upgrade Your Plan</h2>
            <div className="comparison-grid">
              <div className="comparison-card">
                <h3>Pro</h3>
                <p className="price">₹249<span>/month</span></p>
                <ul className="features">
                  <li>✓ Unlimited AI scans</li>
                  <li>✓ Unlimited accounts</li>
                  <li>✓ Lifetime transaction history</li>
                  <li>✓ Advanced insights</li>
                  <li>✓ Unlimited AI chat</li>
                  <li>✓ Priority support</li>
                  <li>✓ Export capabilities</li>
                </ul>
                <button
                  className="btn btn-primary"
                  onClick={() => handleUpgrade('pro')}
                >
                  Upgrade to Pro
                </button>
              </div>

              <div className="comparison-card highlighted">
                <div className="badge">Best for Teams</div>
                <h3>Team</h3>
                <p className="price">₹999<span>/month</span></p>
                <ul className="features">
                  <li>✓ Everything in Pro</li>
                  <li>✓ Team collaboration</li>
                  <li>✓ Organization workspace</li>
                  <li>✓ Project folders</li>
                  <li>✓ Team activity feed</li>
                  <li>✓ Admin controls</li>
                </ul>
                <button
                  className="btn btn-primary"
                  onClick={() => handleUpgrade('team')}
                >
                  Upgrade to Team
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Billing Information */}
        {subscription?.tier !== 'free' && (
          <div className="billing-info">
            <h2>Billing Information</h2>
            <p>Manage your payment methods and billing details through the Stripe portal.</p>
            <button
              className="btn btn-secondary"
              onClick={handleManageSubscription}
            >
              Open Billing Portal
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingSettings;
