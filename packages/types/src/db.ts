/**
 * Database schemas and types
 * Firestore document interfaces
 */

export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

// User collection
export interface User {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  subscription: {
    tier: 'free' | 'pro' | 'team';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    expiresAt?: Timestamp;
  };
}

// Organizations collection
export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  subscription: {
    tier: 'free' | 'team';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    expiresAt?: Timestamp;
  };
}

// Projects collection (folders)
export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  organizationId: string | null;
  ownerId: string;
  parentProjectId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archivedAt?: Timestamp;
}

// Boards collection
export interface Board {
  id: string;
  name: string;
  thumbnail?: string;
  projectId: string | null;
  organizationId: string | null;
  ownerId: string;
  collaborators: Array<{
    userId: string;
    role: 'editor' | 'viewer';
    addedAt: Timestamp;
  }>;
  isPublic: boolean;
  publicLinkId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastOpenedAt: Timestamp;
  archivedAt?: Timestamp;
  version: number;
}

// Board content subcollection
export interface BoardContent {
  elementsJSON: string;
  appStateJSON: string;
  updatedAt: Timestamp;
  updatedBy: string;
  version: number;
  checksum: string;
}

// Board versions subcollection
export interface BoardVersion {
  id: string;
  elementsJSON: string;
  appStateJSON: string;
  createdAt: Timestamp;
  createdBy: string;
  note?: string;
  isAutoSave: boolean;
}

// Templates collection
export interface Template {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category: string;
  elementsJSON: string;
  appStateJSON: string;
  isBuiltIn: boolean;
  organizationId: string | null;
  createdBy: string | null;
  createdAt: Timestamp;
  usageCount: number;
}

// Scenes collection (existing collaboration rooms)
export interface Scene {
  id: string;
  data: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
