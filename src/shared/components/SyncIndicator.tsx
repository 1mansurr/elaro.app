/**
 * SyncIndicator Component
 *
 * Displays a syncing indicator when the SyncManager is actively processing
 * the offline queue. Subscribes to SyncManager state changes for real-time updates.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { syncManager } from '@/services/syncManager';
import { QueueStats } from '@/types/offline';
import { useTheme } from '@/contexts/ThemeContext';

export const SyncIndicator: React.FC = () => {
  const [stats, setStats] = useState<QueueStats>(syncManager.getQueueStats());
  const [isSyncing, setIsSyncing] = useState(syncManager.getIsSyncing());
  const { theme } = useTheme();

  useEffect(() => {
    // Subscribe to queue changes
    const unsubscribe = syncManager.subscribe(newStats => {
      setStats(newStats);
      setIsSyncing(syncManager.getIsSyncing());
    });

    // Also poll isSyncing state since it might change independently
    const intervalId = setInterval(() => {
      setIsSyncing(syncManager.getIsSyncing());
    }, 500);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  // Don't show if nothing to sync
  if (stats.pending === 0 && !isSyncing) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.accent }]}>
      <ActivityIndicator size="small" color="#FFFFFF" />
      <Text style={styles.text}>
        {isSyncing
          ? `🔄 Syncing ${stats.pending} ${stats.pending === 1 ? 'item' : 'items'}...`
          : `⏳ ${stats.pending} ${stats.pending === 1 ? 'item' : 'items'} waiting to sync`}
      </Text>
      {stats.failed > 0 && (
        <Text style={styles.failedText}>({stats.failed} failed)</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  failedText: {
    color: '#FFE5E5',
    fontSize: 11,
    fontWeight: '500',
  },
});
