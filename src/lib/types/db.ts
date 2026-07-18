/** Shared database value types used by the typed model interfaces. */

export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

export interface Scene {
  id: string;
  data: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
