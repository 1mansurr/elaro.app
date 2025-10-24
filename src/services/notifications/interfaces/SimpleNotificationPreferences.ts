/**
 * Simplified Notification Preferences Interface
 * 
 * This interface provides essential notification preferences without
 * the complexity of the over-engineered NotificationPreferences interface.
 */

export interface SimpleNotificationPreferences {
  // Master Controls
  enabled: boolean;
  
  // Notification Types
  reminders: boolean;
  assignments: boolean;
  lectures: boolean;
  studySessions: boolean;
  dailySummaries: boolean;
  marketing: boolean;
  
  // Timing Preferences
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  
  // Metadata
  userId: string;
  updatedAt: Date;
}

export interface SimpleNotificationPreferencesUpdate {
  enabled?: boolean;
  reminders?: boolean;
  assignments?: boolean;
  lectures?: boolean;
  studySessions?: boolean;
  dailySummaries?: boolean;
  marketing?: boolean;
  quietHours?: {
    enabled?: boolean;
    start?: string;
    end?: string;
  };
}
