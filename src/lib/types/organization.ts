/**
 * Organization types
 */

import type { Timestamp } from './db';

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
  subscription: {
    tier: 'free' | 'team';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    expiresAt?: Timestamp;
  };
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'revoked';
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
}
