import { versionedApiClient } from '@/services/VersionedApiClient';
import {
  INotificationPreferenceService,
  NotificationPreferences,
  ValidationResult,
} from './interfaces/INotificationPreferenceService';

/**
 * Service responsible for notification preference management
 * Handles user settings, validation, and preference optimization
 */
export class NotificationPreferenceService
  implements INotificationPreferenceService
{
  private static instance: NotificationPreferenceService;

  private constructor() {}

  public static getInstance(): NotificationPreferenceService {
    if (!NotificationPreferenceService.instance) {
      NotificationPreferenceService.instance =
        new NotificationPreferenceService();
    }
    return NotificationPreferenceService.instance;
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const response = await versionedApiClient.getNotificationPreferences();

      if (response.error) {
        console.error('Error getting user preferences:', response.error);
        return this.getDefaultPreferences();
      }

      if (!response.data) {
        // Return default preferences for new users
        return this.getDefaultPreferences();
      }

      // Convert database format to our interface
      return this.convertFromDatabase(response.data);
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<void> {
    try {
      // Validate preferences before saving
      const validation = await this.validatePreferences(
        preferences as NotificationPreferences,
      );
      if (!validation.isValid) {
        throw new Error(`Invalid preferences: ${validation.errors.join(', ')}`);
      }

      // Convert to database format
      const dbPreferences = this.convertToDatabase(preferences);

      const response =
        await versionedApiClient.updateNotificationPreferences(dbPreferences);

      if (response.error) {
        throw new Error(
          response.message || response.error || 'Failed to update preferences',
        );
      }

      console.log('Notification preferences updated successfully');
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Validate notification preferences
   */
  async validatePreferences(
    preferences: NotificationPreferences,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate quiet hours
    if (preferences.quietHours.enabled) {
      const startTime = this.parseTime(preferences.quietHours.start);
      const endTime = this.parseTime(preferences.quietHours.end);

      if (startTime >= endTime) {
        errors.push('Quiet hours start time must be before end time');
      }
    }

    // Validate preferred times
    const morningTime = this.parseTime(preferences.preferredTimes.morning);
    const eveningTime = this.parseTime(preferences.preferredTimes.evening);

    if (morningTime >= eveningTime) {
      warnings.push('Morning preferred time should be before evening time');
    }

    // Validate frequency settings
    if (
      preferences.frequency.maxPerDay < 1 ||
      preferences.frequency.maxPerDay > 50
    ) {
      errors.push('Max notifications per day must be between 1 and 50');
    }

    if (
      preferences.frequency.cooldownPeriod < 0 ||
      preferences.frequency.cooldownPeriod > 1440
    ) {
      errors.push(
        'Cooldown period must be between 0 and 1440 minutes (24 hours)',
      );
    }

    // Check for potential notification fatigue
    if (preferences.frequency.maxPerDay > 20) {
      warnings.push('High notification frequency may cause user fatigue');
    }

    // Validate that at least one notification type is enabled
    const hasEnabledTypes = Object.values(preferences.notificationTypes).some(
      enabled => enabled,
    );
    if (!hasEnabledTypes && preferences.masterToggle) {
      warnings.push(
        'Master toggle is enabled but no notification types are selected',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get default preferences for new users
   */
  getDefaultPreferences(): NotificationPreferences {
    return {
      // Master Controls
      masterToggle: true,
      doNotDisturb: false,

      // Timing Preferences
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
      },
      preferredTimes: {
        morning: '09:00',
        evening: '18:00',
        weekend: true,
      },

      // Notification Types
      notificationTypes: {
        reminders: true,
        achievements: true,
        updates: true,
        marketing: false,
        assignments: true,
        lectures: true,
        srs: true,
        dailySummaries: true,
      },

      // Frequency Settings
      frequency: {
        reminders: 'immediate',
        summaries: 'daily',
        updates: 'immediate',
        maxPerDay: 10,
        cooldownPeriod: 30,
      },

      // Advanced Settings
      advanced: {
        vibration: true,
        sound: true,
        badges: true,
        preview: true,
        locationAware: false,
        activityAware: false,
      },

      // Metadata
      userId: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Check if user has notifications enabled
   */
  async areNotificationsEnabled(userId: string): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);
      return preferences.masterToggle && !preferences.doNotDisturb;
    } catch (error) {
      console.error('Error checking notification status:', error);
      return false;
    }
  }

  /**
   * Convert database format to our interface
   * Handles missing columns gracefully with defaults
   */
  private convertFromDatabase(
    data: Record<string, unknown>,
  ): NotificationPreferences {
    // Handle master toggle - check master_toggle first, fallback to reminders_enabled
    const masterToggle = data.master_toggle ?? data.reminders_enabled ?? true;

    return {
      masterToggle,
      doNotDisturb: data.do_not_disturb ?? false,

      quietHours: {
        enabled:
          data.quiet_hours_enabled ??
          (data.quiet_hours_start != null && data.quiet_hours_end != null),
        start: data.quiet_hours_start ?? '22:00',
        end: data.quiet_hours_end ?? '08:00',
      },

      preferredTimes: {
        morning: data.preferred_morning_time ?? data.morning_time ?? '09:00',
        evening: data.preferred_evening_time ?? data.evening_time ?? '18:00',
        weekend: data.weekend_notifications_enabled ?? true,
      },

      notificationTypes: {
        reminders: data.reminders_enabled ?? true,
        achievements: data.achievements_enabled ?? false, // Not in DB, default false
        updates: data.updates_enabled ?? false, // Not in DB, default false
        marketing: data.marketing_notifications ?? false,
        assignments: data.assignment_reminders_enabled ?? true,
        lectures: data.lecture_reminders_enabled ?? true,
        srs: data.srs_reminders_enabled ?? true,
        dailySummaries: data.morning_summary_enabled ?? true,
      },

      frequency: {
        reminders: data.reminder_frequency ?? 'immediate',
        summaries: data.summary_frequency ?? 'daily',
        updates: data.update_frequency ?? 'immediate',
        maxPerDay: data.max_per_day ?? 10,
        cooldownPeriod: data.cooldown_period ?? 30,
      },

      advanced: {
        vibration: data.vibration_enabled ?? true,
        sound: data.sound_enabled ?? true,
        badges: data.badges_enabled ?? true,
        preview: data.preview_enabled ?? true,
        locationAware: data.location_aware ?? false,
        activityAware: data.activity_aware ?? false,
      },

      userId: data.user_id,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: new Date(data.updated_at ?? Date.now()),
    };
  }

  /**
   * Convert our interface to database format
   */
  private convertToDatabase(
    preferences: Partial<NotificationPreferences>,
  ): Record<string, unknown> {
    const dbData: Record<string, unknown> = {};

    if (preferences.masterToggle !== undefined) {
      dbData.master_toggle = preferences.masterToggle;
    }
    if (preferences.doNotDisturb !== undefined) {
      dbData.do_not_disturb = preferences.doNotDisturb;
    }

    if (preferences.quietHours) {
      dbData.quiet_hours_enabled = preferences.quietHours.enabled;
      dbData.quiet_hours_start = preferences.quietHours.start;
      dbData.quiet_hours_end = preferences.quietHours.end;
    }

    if (preferences.preferredTimes) {
      dbData.morning_time = preferences.preferredTimes.morning;
      dbData.evening_time = preferences.preferredTimes.evening;
      dbData.weekend_notifications_enabled = preferences.preferredTimes.weekend;
    }

    if (preferences.notificationTypes) {
      dbData.reminders_enabled = preferences.notificationTypes.reminders;
      // Note: achievements_enabled, updates_enabled don't exist in DB schema yet
      dbData.marketing_notifications = preferences.notificationTypes.marketing;
      dbData.assignment_reminders_enabled =
        preferences.notificationTypes.assignments;
      dbData.lecture_reminders_enabled = preferences.notificationTypes.lectures;
      dbData.srs_reminders_enabled = preferences.notificationTypes.srs;
      dbData.morning_summary_enabled =
        preferences.notificationTypes.dailySummaries;
    }

    if (preferences.frequency) {
      dbData.reminder_frequency = preferences.frequency.reminders;
      dbData.summary_frequency = preferences.frequency.summaries;
      dbData.update_frequency = preferences.frequency.updates;
      dbData.max_per_day = preferences.frequency.maxPerDay;
      dbData.cooldown_period = preferences.frequency.cooldownPeriod;
    }

    if (preferences.advanced) {
      dbData.vibration_enabled = preferences.advanced.vibration;
      dbData.sound_enabled = preferences.advanced.sound;
      dbData.badges_enabled = preferences.advanced.badges;
      dbData.preview_enabled = preferences.advanced.preview;
      dbData.location_aware = preferences.advanced.locationAware;
      dbData.activity_aware = preferences.advanced.activityAware;
    }

    return dbData;
  }

  /**
   * Parse time string (HH:MM) to minutes since midnight
   */
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
