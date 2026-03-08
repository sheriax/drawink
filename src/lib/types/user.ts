/**
 * User types
 */

import type { Timestamp } from "./db";

export interface User {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  subscription: {
    tier: "free" | "pro" | "team";
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    expiresAt?: Timestamp;
  };
}
