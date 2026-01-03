/**
 * Sync Debug Utilities
 *
 * Dev-only utilities for debugging and testing sync services
 */

import { authSyncService } from '@/services/authSync';
import { navigationSyncService } from '@/services/navigationSync';
import { studySessionSyncService } from '@/services/studySessionSync';
import { settingsSyncService } from '@/services/settingsSync';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clear all sync state (dev/debugging only)
 */
export async function clearAllSyncState(): Promise<void> {
  if (!__DEV__) {
    console.warn('⚠️ clearAllSyncState: Only available in dev mode');
    return;
  }

  try {
    console.log('🧹 Clearing all sync state...');

    // Clear auth sync
    await authSyncService.clearAuthState();

    // Clear navigation sync
    await navigationSyncService.clearState();

    // Clear study session sync
    await studySessionSyncService.clearActiveSession();

    // Clear settings sync (requires userId, will clear on next use)

    // Clear all AsyncStorage keys with sync prefixes
    const keys = await AsyncStorage.getAllKeys();
    const syncKeys = keys.filter(
      key =>
        key.startsWith('@elaro_') ||
        key.startsWith('@elaro_auth_') ||
        key.startsWith('@elaro_navigation_') ||
        key.startsWith('@elaro_active_session_') ||
        key.startsWith('@elaro_srs_') ||
        key.startsWith('@elaro_session_progress_') ||
        key.startsWith('@elaro_settings_'),
    );

    if (syncKeys.length > 0) {
      await AsyncStorage.multiRemove(syncKeys);
    }

    console.log('✅ All sync state cleared');
  } catch (error) {
    console.error('❌ Failed to clear sync state:', error);
  }
}

/**
 * Get sync state summary
 */
interface SyncStateSummary {
  auth: {
    cached: boolean;
    userId: string | null;
    lastSynced: string | null;
  };
  navigation: {
    hasState: boolean;
    currentRoute: string | null;
    routeCount: number;
  };
  studySession: {
    hasActiveSession: boolean;
    sessionId: string | null;
    status: string | null;
  };
  settings: Record<string, unknown>;
}

export async function getSyncStateSummary(): Promise<SyncStateSummary> {
  try {
    const [authCached, navStats, activeSession] = await Promise.all([
      authSyncService.getCachedAuthState(),
      navigationSyncService.getStats(),
      studySessionSyncService.getActiveSession(),
    ]);

    const summary = {
      auth: {
        cached: !!authCached,
        userId: authCached?.userId || null,
        lastSynced: authCached?.lastSyncedAt || null,
      },
      navigation: {
        hasState: navStats.hasState,
        currentRoute: navStats.currentRoute,
        routeCount: navStats.routeCount,
      },
      studySession: {
        hasActiveSession: !!activeSession,
        sessionId: activeSession?.sessionId || null,
        status: activeSession?.status || null,
      },
      settings: {
        // Settings requires userId, handled separately
      },
    };

    return summary;
  } catch (error) {
    console.error('❌ Failed to get sync state summary:', error);
    return {
      auth: {},
      navigation: {},
      studySession: {},
      settings: {},
    };
  }
}

/**
 * Force sync all services
 */
export async function forceSyncAll(userId?: string): Promise<{
  auth: boolean;
  navigation: boolean;
  studySession: boolean;
  settings: boolean;
}> {
  if (!__DEV__) {
    console.warn('⚠️ forceSyncAll: Only available in dev mode');
    return {
      auth: false,
      navigation: false,
      studySession: false,
      settings: false,
    };
  }

  try {
    console.log('🔄 Forcing sync of all services...');

    const results = {
      auth: false,
      navigation: false,
      studySession: false,
      settings: false,
    };

    // Force auth refresh
    try {
      await authSyncService.refreshSession();
      results.auth = true;
    } catch (error) {
      console.error('❌ Auth sync failed:', error);
    }

    // Study session SRS queue sync
    try {
      const srsResult = await studySessionSyncService.syncSRSQueue();
      results.studySession = srsResult.synced > 0 || srsResult.failed === 0;
    } catch (error) {
      console.error('❌ Study session sync failed:', error);
    }

    // Settings sync
    if (userId) {
      try {
        await settingsSyncService.syncPendingChanges(userId);
        await settingsSyncService.refreshSettings(userId);
        results.settings = true;
      } catch (error) {
        console.error('❌ Settings sync failed:', error);
      }
    }

    // Navigation doesn't need force sync (auto-saves on changes)

    console.log('✅ Force sync complete', results);
    return results;
  } catch (error) {
    console.error('❌ Force sync failed:', error);
    return {
      auth: false,
      navigation: false,
      studySession: false,
      settings: false,
    };
  }
}

/**
 * Export sync state for debugging (returns JSON string)
 */
export async function exportSyncState(): Promise<string> {
  if (!__DEV__) {
    console.warn('⚠️ exportSyncState: Only available in dev mode');
    return '{}';
  }

  try {
    const keys = await AsyncStorage.getAllKeys();
    const syncKeys = keys.filter(key => key.startsWith('@elaro_'));

    const state: Record<string, unknown> = {};
    for (const key of syncKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        // Guard: Only parse if value is valid
        if (value.trim() && value !== 'undefined' && value !== 'null') {
          try {
            state[key] = JSON.parse(value);
          } catch {
            state[key] = value;
          }
        }
      }
    }

    return JSON.stringify(state, null, 2);
  } catch (error) {
    console.error('❌ Failed to export sync state:', error);
    return '{}';
  }
}

/**
 * Import sync state from JSON (for testing)
 */
export async function importSyncState(jsonString: string): Promise<void> {
  if (!__DEV__) {
    console.warn('⚠️ importSyncState: Only available in dev mode');
    return;
  }

  try {
    // Guard: Only parse if jsonString is valid
    if (
      !jsonString ||
      !jsonString.trim() ||
      jsonString === 'undefined' ||
      jsonString === 'null'
    ) {
      return {};
    }

    let state: any;
    try {
      state = JSON.parse(jsonString);
    } catch {
      return {};
    }
    const entries = Object.entries(state);

    for (const [key, value] of entries) {
      if (typeof value === 'string') {
        await AsyncStorage.setItem(key, value);
      } else {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      }
    }

    console.log(`✅ Imported ${entries.length} sync state entries`);
  } catch (error) {
    console.error('❌ Failed to import sync state:', error);
  }
}

// Expose to global for debugging (dev only)
if (__DEV__ && typeof global !== 'undefined') {
  (
    global as typeof global & {
      __ELARO_SYNC_DEBUG__: {
        clearAll: typeof clearAllSyncState;
        summary: typeof getSyncStateSummary;
        forceSync: typeof forceSyncAll;
        export: typeof exportSyncState;
        import: typeof importSyncState;
      };
    }
  ).__ELARO_SYNC_DEBUG__ = {
    clearAll: clearAllSyncState,
    summary: getSyncStateSummary,
    forceSync: forceSyncAll,
    export: exportSyncState,
    import: importSyncState,
  };

  console.log(
    '🔧 Sync debug utilities available at global.__ELARO_SYNC_DEBUG__',
  );
}
