/**
 * Settings and Profile Synchronization Service
 *
 * Manages synchronization between:
 * - Local settings cache (fast reads)
 * - Supabase profile and preferences (source of truth)
 * - Pending changes queue (offline support)
 *
 * Features:
 * - Local-first writes (instant UI updates)
 * - Background sync with Supabase
 * - Timestamp reconciliation
 * - Conflict resolution
 * - Version management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { versionedApiClient } from '@/services/VersionedApiClient';
import { cache } from '@/utils/cache';
import { User } from '@/types';
import { SettingsCache, PendingChange } from '@/types/settings';

// Storage keys
const SETTINGS_CACHE_KEY = '@elaro_settings_cache_v1';
const PENDING_CHANGES_KEY = '@elaro_settings_pending_v1';
const SETTINGS_VERSION_KEY = '@elaro_settings_version_v1';

const SETTINGS_VERSION = 'v1';

// Types moved to @/types/settings.ts

/**
 * SettingsSyncService - Centralized settings and profile synchronization
 */
class SettingsSyncService {
  private listeners: Set<(settings: SettingsCache | null) => void> = new Set();
  private isSyncing = false;

  /**
   * Load settings from cache (fast path)
   */
  async loadFromCache(userId: string): Promise<SettingsCache | null> {
    try {
      const key = `${SETTINGS_CACHE_KEY}:${userId}`;
      const cached = await AsyncStorage.getItem(key);

      if (!cached) {
        return null;
      }

      // Guard: Only parse if cached is valid
      if (
        !cached.trim() ||
        cached === 'undefined' ||
        cached === 'null'
      ) {
        return null;
      }
      
      let settings: SettingsCache;
      try {
        settings = JSON.parse(cached);
      } catch {
        return null;
      }

      // Check version
      if (settings.version !== SETTINGS_VERSION) {
        console.log('⚠️ SettingsSync: Version mismatch, clearing cache');
        await this.clearCache(userId);
        return null;
      }

      // Check if cache is stale (more than 1 hour)
      const age = Date.now() - settings.lastSyncedAt;
      const maxAge = 60 * 60 * 1000; // 1 hour

      if (age > maxAge) {
        console.log('⏰ SettingsSync: Cache stale, will refresh in background');
        // Don't clear, just refresh in background
        this.refreshSettings(userId).catch(err => {
          console.error('❌ SettingsSync: Background refresh failed:', err);
        });
      }

      console.log('✅ SettingsSync: Loaded from cache', {
        userId,
        age: Math.floor(age / 1000 / 60), // minutes
      });

      return settings;
    } catch (error) {
      console.error('❌ SettingsSync: Failed to load from cache:', error);
      return null;
    }
  }

  /**
   * Load settings from Supabase (source of truth)
   */
  async loadFromServer(userId: string): Promise<SettingsCache | null> {
    try {
      // Load profile using API layer
      const profileResponse = await versionedApiClient.getUserProfile();
      if (profileResponse.error) {
        throw new Error(
          profileResponse.message ||
            profileResponse.error ||
            'Failed to load profile',
        );
      }

      const profile = profileResponse.data as Partial<User> | null;
      if (!profile) {
        throw new Error('Profile not found');
      }

      // Load notification preferences using API layer
      const prefsResponse =
        await versionedApiClient.getNotificationPreferences();
      const notificationPrefs = prefsResponse.error
        ? null
        : prefsResponse.data || null;

      // SRS preferences are in users.srs_preferences (JSONB)
      const srsPreferences = (profile as any).srs_preferences || {};

      const settings: SettingsCache = {
        userId,
        profile: profile as Partial<User>,
        notificationPreferences: notificationPrefs || null,
        srsPreferences,
        lastSyncedAt: Date.now(),
        version: SETTINGS_VERSION,
      };

      // Save to cache
      await this.saveToCache(settings);

      console.log('✅ SettingsSync: Loaded from server', { userId });
      return settings;
    } catch (error) {
      console.error('❌ SettingsSync: Failed to load from server:', error);
      return null;
    }
  }

  /**
   * Update setting locally (local-first)
   */
  async updateSetting(
    userId: string,
    type: 'profile' | 'notification_preferences' | 'srs_preferences',
    field: string,
    value: string | number | boolean | Date | Record<string, unknown> | null,
  ): Promise<void> {
    try {
      // Load current cache
      let settings = await this.loadFromCache(userId);

      if (!settings) {
        // If no cache, load from server first
        settings = await this.loadFromServer(userId);
        if (!settings) {
          throw new Error('Failed to load settings');
        }
      }

      // Update locally
      if (type === 'profile') {
        (settings.profile as any)[field] = value;
      } else if (type === 'notification_preferences') {
        if (!settings.notificationPreferences) {
          settings.notificationPreferences = {};
        }
        settings.notificationPreferences[field] = value;
      } else if (type === 'srs_preferences') {
        settings.srsPreferences[field] = value;
      }

      // Save to cache immediately (instant UI update)
      await this.saveToCache(settings);
      this.notifyListeners(settings);

      // Queue for sync
      await this.queueChange(userId, type, field, value);

      // Try to sync immediately (non-blocking)
      this.syncPendingChanges(userId).catch(err => {
        console.error(
          '❌ SettingsSync: Immediate sync failed, will retry:',
          err,
        );
      });

      console.log('💾 SettingsSync: Setting updated locally', { type, field });
    } catch (error) {
      console.error('❌ SettingsSync: Failed to update setting:', error);
      throw error;
    }
  }

  /**
   * Sync all pending changes to Supabase
   */
  async syncPendingChanges(
    userId: string,
  ): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) {
      console.log('⏳ SettingsSync: Already syncing, skipping');
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;

    try {
      const pending = await this.getPendingChanges(userId);
      if (pending.length === 0) {
        return { synced: 0, failed: 0 };
      }

      let synced = 0;
      let failed = 0;
      const remaining: PendingChange[] = [];

      // Group changes by type
      const changesByType = pending.reduce(
        (acc, change) => {
          if (!acc[change.type]) {
            acc[change.type] = [];
          }
          acc[change.type].push(change);
          return acc;
        },
        {} as Record<string, PendingChange[]>,
      );

      // Sync each type
      for (const [type, changes] of Object.entries(changesByType)) {
        try {
          if (type === 'profile') {
            // Batch profile updates using API layer
            const updates: Record<string, unknown> = {};
            for (const change of changes) {
              updates[change.field] = change.value;
            }

            const response =
              await versionedApiClient.updateUserProfile(updates);
            if (response.error) {
              throw new Error(
                response.message ||
                  response.error ||
                  'Failed to update profile',
              );
            }
            synced += changes.length;
          } else if (type === 'notification_preferences') {
            // Batch notification preference updates using API layer
            const updates: Record<string, unknown> = {};
            for (const change of changes) {
              updates[change.field] = change.value;
            }

            const response =
              await versionedApiClient.updateNotificationPreferences(updates);
            if (response.error) {
              throw new Error(
                response.message ||
                  response.error ||
                  'Failed to update notification preferences',
              );
            }
            synced += changes.length;
          } else if (type === 'srs_preferences') {
            // SRS preferences are in users.srs_preferences (JSONB)
            // Get current profile to merge SRS preferences
            const profileResponse = await versionedApiClient.getUserProfile();
            if (profileResponse.error) {
              throw new Error(
                profileResponse.message ||
                  profileResponse.error ||
                  'Failed to load profile',
              );
            }

            const currentProfile = profileResponse.data as any;
            const currentSrs = currentProfile?.srs_preferences || {};

            const srsUpdates: Record<string, unknown> = {};
            for (const change of changes) {
              srsUpdates[change.field] = change.value;
            }
            const mergedSrs = { ...currentSrs, ...srsUpdates };

            // Update profile with merged SRS preferences
            const response = await versionedApiClient.updateUserProfile({
              srs_preferences: mergedSrs,
            });
            if (response.error) {
              throw new Error(
                response.message ||
                  response.error ||
                  'Failed to update SRS preferences',
              );
            }
            synced += changes.length;
          }
        } catch (error) {
          console.error(`❌ SettingsSync: Failed to sync ${type}:`, error);

          // Check retry counts
          for (const change of changes) {
            change.retryCount++;
            if (change.retryCount >= change.maxRetries) {
              failed++;
            } else {
              remaining.push(change);
            }
          }
        }
      }

      // Save remaining changes
      await this.savePendingChanges(userId, remaining);

      // Refresh from server after successful sync
      if (synced > 0) {
        await this.refreshSettings(userId);
      }

      console.log('🔄 SettingsSync: Sync complete', {
        synced,
        failed,
        remaining: remaining.length,
      });
      return { synced, failed };
    } catch (error) {
      console.error('❌ SettingsSync: Sync failed:', error);
      return { synced: 0, failed: 0 };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Refresh settings from server and update cache
   */
  async refreshSettings(userId: string): Promise<SettingsCache | null> {
    try {
      const settings = await this.loadFromServer(userId);
      if (settings) {
        this.notifyListeners(settings);
      }
      return settings;
    } catch (error) {
      console.error('❌ SettingsSync: Failed to refresh settings:', error);
      return null;
    }
  }

  /**
   * Queue a change for later sync
   */
  private async queueChange(
    userId: string,
    type: 'profile' | 'notification_preferences' | 'srs_preferences',
    field: string,
    value: string | number | boolean | Date | Record<string, unknown> | null,
  ): Promise<void> {
    try {
      const pending = await this.getPendingChanges(userId);

      // Check if there's already a pending change for this field
      const existingIndex = pending.findIndex(
        c => c.type === type && c.field === field,
      );

      const change: PendingChange = {
        id: `${type}_${field}_${Date.now()}`,
        type,
        field,
        value,
        timestamp: Date.now(),
        retryCount: existingIndex >= 0 ? pending[existingIndex].retryCount : 0,
        maxRetries: 3,
      };

      if (existingIndex >= 0) {
        // Update existing change
        pending[existingIndex] = change;
      } else {
        // Add new change
        pending.push(change);
      }

      await this.savePendingChanges(userId, pending);
    } catch (error) {
      console.error('❌ SettingsSync: Failed to queue change:', error);
    }
  }

  /**
   * Get pending changes
   */
  private async getPendingChanges(userId: string): Promise<PendingChange[]> {
    try {
      const key = `${PENDING_CHANGES_KEY}:${userId}`;
      const stored = await AsyncStorage.getItem(key);
      if (
        !stored ||
        !stored.trim() ||
        stored === 'undefined' ||
        stored === 'null'
      ) {
        return [];
      }
      
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    } catch (error) {
      console.error('❌ SettingsSync: Failed to get pending changes:', error);
      return [];
    }
  }

  /**
   * Save pending changes
   */
  private async savePendingChanges(
    userId: string,
    changes: PendingChange[],
  ): Promise<void> {
    try {
      const key = `${PENDING_CHANGES_KEY}:${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(changes));
    } catch (error) {
      console.error('❌ SettingsSync: Failed to save pending changes:', error);
    }
  }

  /**
   * Save to cache
   */
  private async saveToCache(settings: SettingsCache): Promise<void> {
    try {
      const key = `${SETTINGS_CACHE_KEY}:${settings.userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(settings));

      // Also cache in CacheManager for consistency
      await cache.setMedium(`settings:${settings.userId}`, settings);
    } catch (error) {
      console.error('❌ SettingsSync: Failed to save to cache:', error);
    }
  }

  /**
   * Clear cache
   */
  async clearCache(userId: string): Promise<void> {
    try {
      const key = `${SETTINGS_CACHE_KEY}:${userId}`;
      await AsyncStorage.removeItem(key);
      await cache.remove(`settings:${userId}`);
      this.notifyListeners(null);
    } catch (error) {
      console.error('❌ SettingsSync: Failed to clear cache:', error);
    }
  }

  /**
   * Clear pending changes
   */
  async clearPendingChanges(userId: string): Promise<void> {
    try {
      const key = `${PENDING_CHANGES_KEY}:${userId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('❌ SettingsSync: Failed to clear pending changes:', error);
    }
  }

  /**
   * Subscribe to settings changes
   */
  onSettingsChange(
    callback: (settings: SettingsCache | null) => void,
  ): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(settings: SettingsCache | null): void {
    this.listeners.forEach(callback => {
      try {
        callback(settings);
      } catch (error) {
        console.error('❌ SettingsSync: Listener error:', error);
      }
    });
  }

  /**
   * Get sync statistics
   */
  async getStats(userId: string): Promise<{
    hasCache: boolean;
    lastSyncedAt: number | null;
    pendingChanges: number;
    cacheAge: number | null;
  }> {
    try {
      const cache = await this.loadFromCache(userId);
      const pending = await this.getPendingChanges(userId);

      return {
        hasCache: !!cache,
        lastSyncedAt: cache?.lastSyncedAt || null,
        pendingChanges: pending.length,
        cacheAge: cache ? Date.now() - cache.lastSyncedAt : null,
      };
    } catch (error) {
      console.error('❌ SettingsSync: Failed to get stats:', error);
      return {
        hasCache: false,
        lastSyncedAt: null,
        pendingChanges: 0,
        cacheAge: null,
      };
    }
  }
}

export const settingsSyncService = new SettingsSyncService();
