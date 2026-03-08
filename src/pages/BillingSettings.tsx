/**
 * Billing Settings Page
 * Shows user that all features are available for free
 */

import { useUser } from "@clerk/clerk-react";
import type React from "react";
import "./BillingSettings.scss";

const BillingSettings: React.FC = () => {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
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

  return (
    <div className="billing-settings">
      <div className="container">
        <h1>Billing & Subscription</h1>

        <div className="current-plan">
          <h2>Current Plan</h2>
          <div className="plan-card">
            <div className="plan-header">
              <div className="plan-info">
                <h3>Free - All Features Unlocked</h3>
                <p className="plan-price">₹0/month</p>
              </div>
              <div className="status-badge active">Active</div>
            </div>

            <div className="plan-details">
              <p>You have access to all features for free!</p>
            </div>
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
