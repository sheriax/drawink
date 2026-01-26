/**
 * Project types (folders)
 */

import type { Timestamp } from './db';

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
