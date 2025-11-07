/**
 * Sync Debug Hook
 *
 * Provides visibility into all sync services' states:
 * - Auth sync status
 * - Navigation sync status
 * - Study session sync status
 * - Settings sync status
 *
 * Usage (dev mode only):
 * ```tsx
 * const syncDebug = useSyncDebug();
 * console.log(syncDebug);
 * ```
 */

import { useEffect, useState } from 'react';
import { authSyncService } from '@/services/authSync';
import { navigationSyncService } from '@/services/navigationSync';
import { studySessionSyncService } from '@/services/studySessionSync';
import { settingsSyncService } from '@/services/settingsSync';
import { useAuth } from '@/contexts/AuthContext';

export interface SyncDebugInfo {
  auth: {
    hasSession: boolean;
    userId: string | null;
    lastSyncedAt: number | null;
    cacheValid: boolean;
  };
  navigation: {
    hasState: boolean;
    currentRoute: string | null;
    routeCount: number;
    userId: string | null;
  };
  studySession: {
    hasActiveSession: boolean;
    sessionId: string | null;
    timeSpentMinutes: number;
    status: string | null;
    srsQueueLength: number;
  };
  settings: {
    hasCache: boolean;
    lastSyncedAt: number | null;
    pendingChanges: number;
    cacheAge: number | null;
  };
  timestamp: number;
}

/**
 * Hook to get comprehensive sync state debug information
 */
export function useSyncDebug(enabled: boolean = __DEV__): SyncDebugInfo | null {
  const { session, user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<SyncDebugInfo | null>(null);

  useEffect(() => {
    if (!enabled) {
      setDebugInfo(null);
      return;
    }

    const updateDebugInfo = async () => {
      try {
        // Auth sync info
        const cachedAuth = await authSyncService.getCachedAuthState();
        const currentSession = await authSyncService.getCurrentSession();

        // Navigation sync info
        const navStats = await navigationSyncService.getStats();
        const navState = navigationSyncService.getCurrentState();

        // Study session sync info
        const activeSession = await studySessionSyncService.getActiveSession();

        // Settings sync info
        const settingsStats = user?.id
          ? await settingsSyncService.getStats(user.id)
          : {
              hasCache: false,
              lastSyncedAt: null,
              pendingChanges: 0,
              cacheAge: null,
            };

        const info: SyncDebugInfo = {
          auth: {
            hasSession: !!currentSession,
            userId: currentSession?.user?.id || cachedAuth?.userId || null,
            lastSyncedAt: cachedAuth?.lastSyncedAt || null,
            cacheValid: !!cachedAuth,
          },
          navigation: {
            hasState: navStats.hasState,
            currentRoute: navStats.currentRoute,
            routeCount: navStats.routeCount,
            userId: (navState as any)?.userId || null,
          },
          studySession: {
            hasActiveSession: !!activeSession,
            sessionId: activeSession?.sessionId || null,
            timeSpentMinutes: activeSession
              ? Math.floor(activeSession.timeSpentSeconds / 60)
              : 0,
            status: activeSession?.status || null,
            srsQueueLength: 0, // TODO: Add method to get queue length
          },
          settings: settingsStats,
          timestamp: Date.now(),
        };

        setDebugInfo(info);
      } catch (error) {
        console.error('❌ useSyncDebug: Failed to get debug info:', error);
        setDebugInfo(null);
      }
    };

    // Initial update
    updateDebugInfo();

    // Update every 5 seconds
    const interval = setInterval(updateDebugInfo, 5000);

    return () => clearInterval(interval);
  }, [enabled, session, user]);

  return debugInfo;
}

/**
 * Hook to monitor sync health
 */
export function useSyncHealth(): {
  isHealthy: boolean;
  issues: string[];
} {
  const debugInfo = useSyncDebug(true);

  if (!debugInfo) {
    return { isHealthy: true, issues: [] };
  }

  const issues: string[] = [];

  // Check auth sync
  if (debugInfo.auth.hasSession && !debugInfo.auth.cacheValid) {
    issues.push('Auth: Session exists but cache invalid');
  }

  // Check navigation sync
  if (debugInfo.navigation.hasState && !debugInfo.navigation.currentRoute) {
    issues.push('Navigation: State exists but no current route');
  }

  // Check study session sync
  if (debugInfo.studySession.hasActiveSession) {
    const sessionAge = Date.now() - (debugInfo.timestamp - 60000); // Rough estimate
    if (sessionAge > 24 * 60 * 60 * 1000) {
      issues.push('Study Session: Active session older than 24 hours');
    }
  }

  // Check settings sync
  if (debugInfo.settings.pendingChanges > 10) {
    issues.push(
      `Settings: ${debugInfo.settings.pendingChanges} pending changes (high)`,
    );
  }

  if (
    debugInfo.settings.cacheAge &&
    debugInfo.settings.cacheAge > 2 * 60 * 60 * 1000
  ) {
    issues.push('Settings: Cache older than 2 hours');
  }

  return {
    isHealthy: issues.length === 0,
    issues,
  };
}

/**
 * Utility function to print sync debug info to console
 */
export function printSyncDebug(debugInfo: SyncDebugInfo | null): void {
  if (!debugInfo) {
    console.log('🔍 Sync Debug: Not available');
    return;
  }

  console.group('🔍 Sync Debug Information');

  console.group('🔐 Auth Sync');
  console.log('Has Session:', debugInfo.auth.hasSession);
  console.log('User ID:', debugInfo.auth.userId);
  console.log(
    'Last Synced:',
    debugInfo.auth.lastSyncedAt
      ? new Date(debugInfo.auth.lastSyncedAt).toISOString()
      : 'Never',
  );
  console.log('Cache Valid:', debugInfo.auth.cacheValid);
  console.groupEnd();

  console.group('🧭 Navigation Sync');
  console.log('Has State:', debugInfo.navigation.hasState);
  console.log('Current Route:', debugInfo.navigation.currentRoute);
  console.log('Route Count:', debugInfo.navigation.routeCount);
  console.log('User ID:', debugInfo.navigation.userId);
  console.groupEnd();

  console.group('📚 Study Session Sync');
  console.log('Has Active Session:', debugInfo.studySession.hasActiveSession);
  console.log('Session ID:', debugInfo.studySession.sessionId);
  console.log(
    'Time Spent:',
    debugInfo.studySession.timeSpentMinutes,
    'minutes',
  );
  console.log('Status:', debugInfo.studySession.status);
  console.log('SRS Queue:', debugInfo.studySession.srsQueueLength);
  console.groupEnd();

  console.group('⚙️ Settings Sync');
  console.log('Has Cache:', debugInfo.settings.hasCache);
  console.log(
    'Last Synced:',
    debugInfo.settings.lastSyncedAt
      ? new Date(debugInfo.settings.lastSyncedAt).toISOString()
      : 'Never',
  );
  console.log('Pending Changes:', debugInfo.settings.pendingChanges);
  console.log(
    'Cache Age:',
    debugInfo.settings.cacheAge
      ? `${Math.floor(debugInfo.settings.cacheAge / 1000 / 60)} minutes`
      : 'N/A',
  );
  console.groupEnd();

  console.log('Timestamp:', new Date(debugInfo.timestamp).toISOString());
  console.groupEnd();
}
