/**
 * Interface for intelligent notification scheduling
 * Handles smart timing, batching, and contextual awareness
 */
export interface INotificationSchedulingService {
  /**
   * Schedule a notification with smart timing
   */
  scheduleWithSmartTiming(notification: Notification, options: SmartSchedulingOptions): Promise<void>;

  /**
   * Find optimal time for a notification based on user behavior
   */
  findOptimalTime(userId: string, notification: Notification): Promise<Date>;

  /**
   * Batch multiple notifications for a user
   */
  batchNotifications(userId: string, notifications: Notification[]): Promise<void>;

  /**
   * Handle notification rescheduling
   */
  handleRescheduling(notificationId: string, reason: string): Promise<void>;

  /**
   * Check if time is within quiet hours
   */
  isWithinQuietHours(userId: string, time: Date): Promise<boolean>;

  /**
   * Get user's optimal notification times
   */
  getOptimalTimes(userId: string): Promise<OptimalTime[]>;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  priority: NotificationPriority;
  data?: Record<string, any>;
  userId: string;
  scheduledFor?: Date;
  category?: string;
}

export interface SmartSchedulingOptions {
  // Smart Timing
  smartTiming: {
    enabled: boolean;
    learningPattern: 'morning' | 'evening' | 'mixed';
    optimalHours: number[];
    avoidHours: number[];
  };
  
  // Frequency Control
  frequency: {
    type: 'immediate' | 'batched' | 'smart';
    batchWindow: number; // minutes
    maxPerDay: number;
    cooldownPeriod: number; // minutes between notifications
  };
  
  // Context Awareness
  context: {
    locationAware: boolean;
    activityAware: boolean;
    timezoneAware: boolean;
    weekendBehavior: 'same' | 'reduced' | 'disabled';
  };
  
  // Rescheduling
  rescheduling: {
    autoReschedule: boolean;
    maxReschedules: number;
    rescheduleDelay: number; // minutes
  };
}

export interface OptimalTime {
  hour: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  engagementScore: number; // 0-1, higher is better
  context: string; // 'morning', 'evening', 'weekend', etc.
}

export type NotificationType = 
  | 'reminder' 
  | 'assignment' 
  | 'lecture' 
  | 'srs' 
  | 'achievement' 
  | 'update' 
  | 'marketing' 
  | 'daily_summary';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
