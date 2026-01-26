/**
 * Database shared types
 * Firestore common interfaces
 */

export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

// Scenes collection (existing collaboration rooms)
export interface Scene {
  id: string;
  data: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
