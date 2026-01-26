/**
 * Board types
 */

import type { Timestamp } from './db';

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

export interface BoardContent {
  elementsJSON: string;
  appStateJSON: string;
  updatedAt: Timestamp;
  updatedBy: string;
  version: number;
  checksum: string;
}

export interface BoardVersion {
  id: string;
  elementsJSON: string;
  appStateJSON: string;
  createdAt: Timestamp;
  createdBy: string;
  note?: string;
  isAutoSave: boolean;
}
