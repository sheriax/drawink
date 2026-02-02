/**
 * useSyncStatus Hook
 *
 * React hook for tracking cloud sync status.
 * Provides reactive updates for online/offline state and pending operations.
 */

import { useEffect, useState } from "react";

import { type CloudSyncStatus, hybridStorageAdapter } from "@/data/HybridStorageAdapter";
import { offlineQueue } from "@/data/OfflineQueue";

export function useSyncStatus(): CloudSyncStatus {
  const [status, setStatus] = useState<CloudSyncStatus>(() => hybridStorageAdapter.getSyncStatus());

  useEffect(() => {
    // Listen for online/offline changes
    const handleOnline = () => setStatus((s) => ({ ...s, isOnline: true }));
    const handleOffline = () => setStatus((s) => ({ ...s, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Subscribe to sync status changes from adapter
    hybridStorageAdapter.onSyncStatusChange(setStatus);

    // Subscribe to queue changes
    const unsubscribeQueue = offlineQueue.onSync(() => {
      setStatus(hybridStorageAdapter.getSyncStatus());
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribeQueue();
    };
  }, []);

  return status;
}

/**
 * Get a human-readable last sync message
 */
export function getLastSyncMessage(timestamp: number | null): string {
  if (!timestamp) return "Never synced";

  const hours = (Date.now() - timestamp) / (1000 * 60 * 60);

  if (hours < 1) return "Synced recently";
  if (hours < 24) return `Last synced ${Math.floor(hours)} hours ago`;
  return `Last synced ${Math.floor(hours / 24)} days ago`;
}
