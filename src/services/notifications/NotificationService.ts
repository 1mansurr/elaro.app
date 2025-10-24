import { NotificationDeliveryService } from './NotificationDeliveryService';
import { NotificationPreferenceService } from './NotificationPreferenceService';
import { NotificationSchedulingService } from './NotificationSchedulingService';
import { notificationHistoryService } from './NotificationHistoryService';
import { weeklyAnalyticsService } from '../analytics/WeeklyAnalyticsService';
import { batchProcessingService } from '../analytics/BatchProcessingService';
import { 
  INotificationDeliveryService, 
  INotificationPreferenceService, 
  INotificationSchedulingService
} from './interfaces';

/**
 * Centralized notification service that orchestrates all notification operations
 * This is the main entry point for all notification functionality
 */
export class NotificationService {
  private static instance: NotificationService;
  
  public readonly delivery: INotificationDeliveryService;
  public readonly preferences: INotificationPreferenceService;
  public readonly scheduling: INotificationSchedulingService;
  public readonly history: typeof notificationHistoryService;
  public readonly weeklyAnalytics: typeof weeklyAnalyticsService;
  public readonly batchProcessing: typeof batchProcessingService;

  private constructor() {
    this.delivery = NotificationDeliveryService.getInstance();
    this.preferences = NotificationPreferenceService.getInstance();
    this.scheduling = NotificationSchedulingService.getInstance();
    this.history = notificationHistoryService;
    this.weeklyAnalytics = weeklyAnalyticsService;
    this.batchProcessing = batchProcessingService;
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification system
   * Call this once during app startup
   */
  async initialize(): Promise<void> {
    try {
      // Set up notification categories and channels
      await this.delivery.setupNotificationCategories();
      await this.delivery.setupAndroidChannels();
      
      console.log('✅ Notification system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize notification system:', error);
      throw error;
    }
  }

  /**
   * Set navigation reference for handling notification taps
   */
  setNavigationRef(ref: any): void {
    this.delivery.setNavigationRef(ref);
  }

  /**
   * Quick method to send a notification with smart scheduling
   */
  async sendSmartNotification(
    userId: string,
    title: string,
    body: string,
    type: string = 'reminder',
    priority: string = 'normal',
    data?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Check if user has notifications enabled
      const enabled = await this.preferences.areNotificationsEnabled(userId);
      if (!enabled) {
        console.log('Notifications disabled for user');
        return false;
      }

      // Create notification object
      const notification = {
        id: `smart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        body,
        type,
        priority,
        userId,
        data
      };

      // Schedule with smart timing
      await this.scheduling.scheduleWithSmartTiming(notification, {
        smartTiming: {
          enabled: true,
          learningPattern: 'mixed',
          optimalHours: [],
          avoidHours: []
        },
        frequency: {
          type: 'smart',
          batchWindow: 30,
          maxPerDay: 10,
          cooldownPeriod: 30
        },
        context: {
          locationAware: false,
          activityAware: false,
          timezoneAware: true,
          weekendBehavior: 'same'
        },
        rescheduling: {
          autoReschedule: true,
          maxReschedules: 3,
          rescheduleDelay: 60
        }
      });

      return true;

    } catch (error) {
      console.error('Error sending smart notification:', error);
      return false;
    }
  }

  /**
   * Quick method to get user's notification preferences
   */
  async getUserPreferences(userId: string) {
    return await this.preferences.getUserPreferences(userId);
  }

  /**
   * Quick method to update user preferences
   */
  async updateUserPreferences(userId: string, preferences: any) {
    return await this.preferences.updatePreferences(userId, preferences);
  }

}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
