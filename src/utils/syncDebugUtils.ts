/**
 * Sync Debug Utilities — offline MVP stub
 * Sync services removed; AsyncStorage inspection retained.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface SyncStateSummary {
  auth: { cached: boolean; userId: string | null; lastSynced: string | null };
  navigation: { hasState: boolean; currentRoute: string | null; routeCount: number };
  studySession: { hasActiveSession: boolean; sessionId: string | null; status: string | null };
  settings: Record<string, unknown>;
}

export async function clearAllSyncState(): Promise<void> {
  if (!__DEV__) {
    console.warn('⚠️ clearAllSyncState: Only available in dev mode');
    return;
  }
  try {
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

export async function getSyncStateSummary(): Promise<SyncStateSummary> {
  return {
    auth: { cached: false, userId: null, lastSynced: null },
    navigation: { hasState: false, currentRoute: null, routeCount: 0 },
    studySession: { hasActiveSession: false, sessionId: null, status: null },
    settings: {},
  };
}

export async function forceSyncAll(_userId?: string): Promise<{
  auth: boolean;
  navigation: boolean;
  studySession: boolean;
  settings: boolean;
}> {
  return { auth: false, navigation: false, studySession: false, settings: false };
}

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
      if (value && value.trim() && value !== 'undefined' && value !== 'null') {
        try { state[key] = JSON.parse(value); } catch { state[key] = value; }
      }
    }
    return JSON.stringify(state, null, 2);
  } catch (error) {
    console.error('❌ Failed to export sync state:', error);
    return '{}';
  }
}

export async function importSyncState(jsonString: string): Promise<void> {
  if (!__DEV__) {
    console.warn('⚠️ importSyncState: Only available in dev mode');
    return;
  }
  try {
    if (!jsonString || !jsonString.trim() || jsonString === 'undefined' || jsonString === 'null') return;
    let state: any;
    try { state = JSON.parse(jsonString); } catch { return; }
    const entries = Object.entries(state);
    for (const [key, value] of entries) {
      await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    console.log(`✅ Imported ${entries.length} sync state entries`);
  } catch (error) {
    console.error('❌ Failed to import sync state:', error);
  }
}

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
  console.log('🔧 Sync debug utilities available at global.__ELARO_SYNC_DEBUG__');
}
