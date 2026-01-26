/**
 * API types and interfaces
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Scene API types
export interface SceneData {
  id: string;
  data: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetSceneRequest {
  id: string;
}

export interface StoreSceneRequest {
  sceneData: string;
}

export interface StoreSceneResponse {
  id: string;
  success: boolean;
}
