# State Sync - Quick Reference Guide

## Service Imports

```typescript
import { authSyncService } from '@/services/authSync';
import { navigationSyncService } from '@/services/navigationSync';
import { studySessionSyncService } from '@/services/studySessionSync';
import { settingsSyncService } from '@/services/settingsSync';
import { useSyncDebug, useSyncHealth } from '@/hooks/useSyncDebug';
```

## Common Operations

### Auth Sync

```typescript
// Initialize on app start
const session = await authSyncService.initialize();

// Get current session
const session = await authSyncService.getCurrentSession();

// Refresh session
await authSyncService.refreshSession();

// Clear on logout
await authSyncService.clearAuthState();

// Handle app resume
await authSyncService.onAppResume();
```

### Navigation Sync

```typescript
// Save navigation state
await navigationSyncService.saveState(state, userId);

// Load saved state
const state = await navigationSyncService.loadState(userId);

// Clear state
await navigationSyncService.clearState();

// Get stats
const stats = await navigationSyncService.getStats();
```

### Study Session Sync

```typescript
// Start tracking session
await studySessionSyncService.startSession(sessionId, userId);

// Update progress
await studySessionSyncService.updateSessionProgress(sessionId, {
  timeSpentSeconds: 300,
  notes: 'Great session!',
});

// Pause/Resume
await studySessionSyncService.pauseSession();
await studySessionSyncService.resumeSession();

// Complete session
await studySessionSyncService.completeSession(sessionId, {
  timeSpentMinutes: 30,
  notes: 'Completed',
});

// Record SRS performance
await studySessionSyncService.recordSRSPerformance(sessionId, userId, {
  qualityRating: 4,
  responseTimeSeconds: 5,
});

// Sync SRS queue
await studySessionSyncService.syncSRSQueue();
```

### Settings Sync

```typescript
// Load from cache (fast)
const settings = await settingsSyncService.loadFromCache(userId);

// Load from server (fresh)
const settings = await settingsSyncService.loadFromServer(userId);

// Update setting (local-first)
await settingsSyncService.updateSetting(
  userId,
  'profile',
  'first_name',
  'John',
);

// Sync pending changes
await settingsSyncService.syncPendingChanges(userId);

// Refresh from server
await settingsSyncService.refreshSettings(userId);
```

## Debug Hooks

```typescript
// Get sync debug info
const debugInfo = useSyncDebug(true);

// Monitor sync health
const { isHealthy, issues } = useSyncHealth();

// Print to console
printSyncDebug(debugInfo);
```

## Debug Utilities (Dev Only)

```typescript
import {
  clearAllSyncState,
  getSyncStateSummary,
  forceSyncAll,
  exportSyncState,
  importSyncState,
} from '@/utils/syncDebugUtils';

// Clear all sync state
await clearAllSyncState();

// Get summary
const summary = await getSyncStateSummary();

// Force sync all
await forceSyncAll(userId);

// Export/Import for testing
const json = await exportSyncState();
await importSyncState(json);
```

## Global Debug (Console)

```javascript
// Available in dev mode only
global.__ELARO_SYNC_DEBUG__.summary();
global.__ELARO_SYNC_DEBUG__.clearAll();
global.__ELARO_SYNC_DEBUG__.forceSync(userId);
global.__ELARO_SYNC_DEBUG__.export();
global.__ELARO_SYNC_DEBUG__.import(jsonString);
```

## Storage Keys

| Key                                    | Service       | Purpose                    |
| -------------------------------------- | ------------- | -------------------------- |
| `@elaro_auth_state_v1`                 | Auth          | Auth metadata              |
| `auth_session_token`                   | Auth          | Access token (SecureStore) |
| `@elaro_navigation_state_v1`           | Navigation    | Navigation state           |
| `@elaro_active_session_v1`             | Study Session | Active session             |
| `@elaro_srs_queue_v1`                  | Study Session | SRS performance queue      |
| `@elaro_settings_cache_v1:${userId}`   | Settings      | Settings cache             |
| `@elaro_settings_pending_v1:${userId}` | Settings      | Pending changes            |
