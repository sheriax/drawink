/**
 * Billing Settings Page
 * Shows user's current plan — beta users see a "Beta Access" badge
 * with a notice that features may require a paid plan after beta ends.
 */

import { useUser } from "@clerk/clerk-react";
import type React from "react";
import { useSubscription } from "../hooks/useSubscription";
import "./BillingSettings.scss";

const BillingSettings: React.FC = () => {
  const { user, isLoaded } = useUser();
  const { tier, isBetaUser, isLoading: subLoading } = useSubscription();

  if (!isLoaded || subLoading) {
    return (
      <div className="billing-settings">
        <div className="loading">Loading...</div>
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

  const planName = isBetaUser ? "Beta Access" : tier === "team" ? "Team" : tier === "pro" ? "Pro" : "Free";
  const planPrice = isBetaUser ? "Free during beta" : "₹0/month";

  return (
    <div className="billing-settings">
      <div className="container">
        <h1>Billing & Subscription</h1>

        <div className="current-plan">
          <h2>Current Plan</h2>
          <div className="plan-card">
            <div className="plan-header">
              <div className="plan-info">
                <h3>{planName}</h3>
                <p className="plan-price">{planPrice}</p>
              </div>
              <div className={`status-badge ${isBetaUser ? "beta" : "active"}`}>
                {isBetaUser ? "Beta" : "Active"}
              </div>
            </div>

            <div className="plan-details">
              <p>
                {isBetaUser
                  ? "You have full access to all features as a beta user."
                  : "You have access to all features for free!"}
              </p>
            </div>

            {isBetaUser && (
              <div className="beta-warning">
                <p>
                  When the beta period ends, your account will move to the Free
                  plan. Some features may require a paid plan at that point.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="features-list">
          <h2>Your Available Features</h2>
          <div className="comparison-grid">
            <div className="comparison-card">
              <h3>Included Features</h3>
              <ul className="features">
                <li>✓ Unlimited AI scans</li>
                <li>✓ Unlimited accounts</li>
                <li>✓ Lifetime transaction history</li>
                <li>✓ Advanced insights</li>
                <li>✓ Unlimited AI chat</li>
                <li>✓ Priority support</li>
                <li>✓ Export capabilities</li>
                <li>✓ Team collaboration</li>
                <li>✓ Organization workspace</li>
                <li>✓ Project folders</li>
                <li>✓ Team activity feed</li>
                <li>✓ Admin controls</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingSettings;
