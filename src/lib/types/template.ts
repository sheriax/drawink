/**
 * Template types
 */

import type { Timestamp } from "./db";

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
