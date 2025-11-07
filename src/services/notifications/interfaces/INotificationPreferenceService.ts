/**
 * Interface for notification preference management
 * Handles user notification settings and preferences
 */
export interface INotificationPreferenceService {
  /**
   * Get user notification preferences
   */
  getUserPreferences(userId: string): Promise<NotificationPreferences>;

  /**
   * Update user notification preferences
   */
  updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<void>;

  /**
   * Validate notification preferences
   */
  validatePreferences(
    preferences: NotificationPreferences,
  ): Promise<ValidationResult>;

  /**
   * Get default preferences for new users
   */
  getDefaultPreferences(): NotificationPreferences;

  /**
   * Check if user has notifications enabled
   */
  areNotificationsEnabled(userId: string): Promise<boolean>;
}

export interface NotificationPreferences {
  // Master Controls
  masterToggle: boolean;
  doNotDisturb: boolean;

  // Timing Preferences
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  preferredTimes: {
    morning: string; // HH:MM format
    evening: string; // HH:MM format
    weekend: boolean;
  };

  // Notification Types
  notificationTypes: {
    reminders: boolean;
    achievements: boolean;
    updates: boolean;
    marketing: boolean;
    assignments: boolean;
    lectures: boolean;
    srs: boolean;
    dailySummaries: boolean;
  };

  // Frequency Settings
  frequency: {
    reminders: 'immediate' | 'daily' | 'weekly';
    summaries: 'daily' | 'weekly' | 'disabled';
    updates: 'immediate' | 'daily' | 'disabled';
    maxPerDay: number;
    cooldownPeriod: number; // minutes
  };

  // Advanced Settings
  advanced: {
    vibration: boolean;
    sound: boolean;
    badges: boolean;
    preview: boolean;
    locationAware: boolean;
    activityAware: boolean;
  };

  // Metadata
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
