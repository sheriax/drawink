/**
 * Authentication types
 * Will integrate with Clerk in Phase 2
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  token: string;
  expiresAt: string;
}

export interface AuthContext {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Clerk integration types (Phase 2)
export interface ClerkUser {
  id: string;
  emailAddresses: Array<{
    emailAddress: string;
    verification: {
      status: 'verified' | 'unverified';
    };
  }>;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  createdAt: number;
}

export interface ClerkSession {
  id: string;
  userId: string;
  status: 'active' | 'expired' | 'abandoned';
  lastActiveAt: number;
  expireAt: number;
}

// Organization types (Phase 3)
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
