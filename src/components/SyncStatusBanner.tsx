/**
 * SyncStatusBanner
 *
 * Displays sync status to users:
 * - Offline warning with last sync time
 * - Pending operations indicator
 */

import { useSyncStatus, getLastSyncMessage } from "@/hooks/useSyncStatus";

import "./SyncStatusBanner.scss";

export const SyncStatusBanner: React.FC = () => {
  const { isOnline, isCloudEnabled, pendingOperations, lastSyncTimestamp } = useSyncStatus();

  // Anonymous users don't need sync status
  if (!isCloudEnabled) return null;

  // Everything synced and online - nothing to show
  if (isOnline && pendingOperations === 0) return null;

  return (
    <div className="sync-status-banner">
      {!isOnline && (
        <div className="sync-status-banner__offline">
          <span className="sync-status-banner__icon">⚠️</span>
          <span className="sync-status-banner__text">
            You're offline. Changes will sync when you reconnect.
          </span>
          <span className="sync-status-banner__last-sync">
            {getLastSyncMessage(lastSyncTimestamp)}
          </span>
        </div>
      )}
      {isOnline && pendingOperations > 0 && (
        <div className="sync-status-banner__syncing">
          <span className="sync-status-banner__icon">⏳</span>
          <span className="sync-status-banner__text">
            Syncing {pendingOperations} change{pendingOperations > 1 ? "s" : ""}...
          </span>
        </div>
      )}
    </div>
  );
};
