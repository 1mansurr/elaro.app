/**
 * Settings and Preferences Types
 *
 * Defines types for user settings, preferences, and synchronization.
 */

import { User } from '@/types/entities';
import { NotificationPreferences } from '@/services/notifications/interfaces/INotificationPreferenceService';

/**
 * Settings cache structure
 */
export interface SettingsCache {
  userId: string;
  profile: Partial<User>;
  notificationPreferences: Partial<NotificationPreferences>;
  srsPreferences: Record<string, unknown>;
  lastSyncedAt: number;
  version: string;
}

/**
 * Pending change in settings queue
 */
export interface PendingChange {
  id: string;
  type: 'profile' | 'notification_preferences' | 'srs_preferences';
  field: string;
  value: unknown;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}
