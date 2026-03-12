import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import {
  INotificationDeliveryService,
  NotificationPayload,
  LocalNotification,
  ScheduledNotification,
  DeliveryResult,
  NotificationTrigger,
} from './interfaces/INotificationDeliveryService';
import {
  errorHandler,
  NotificationError,
  ERROR_CODES,
} from './utils/ErrorHandler';
import { RootStackParamList } from '@/types/navigation';

/**
 * Service responsible for notification delivery operations
 * Handles push notifications, local notifications, and cancellation
 */
export class NotificationDeliveryService implements INotificationDeliveryService {
  private static instance: NotificationDeliveryService;
  private navigationRef: NavigationContainerRef<RootStackParamList> | null =
    null;

  private constructor() {}

  public static getInstance(): NotificationDeliveryService {
    if (!NotificationDeliveryService.instance) {
      NotificationDeliveryService.instance = new NotificationDeliveryService();
    }
    return NotificationDeliveryService.instance;
  }

  /**
   * Set navigation reference for handling notification taps
   */
  public setNavigationRef(
    ref: NavigationContainerRef<RootStackParamList> | null,
  ): void {
    this.navigationRef = ref;
  }

  /**
   * Send a push notification to a user
   */
  async sendPushNotification(
    _userId: string,
    _notification: NotificationPayload,
  ): Promise<DeliveryResult> {
    return {
      success: false,
      error: 'Push notifications not available in offline mode',
    };
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    notification: LocalNotification,
  ): Promise<void> {
    try {
      // Validate input
      if (!notification.id || !notification.title || !notification.body) {
        throw errorHandler.createError(
          'Invalid input: id, title, and body are required',
          ERROR_CODES.INVALID_INPUT,
        );
      }

      const request: Notifications.NotificationRequestInput = {
        identifier: notification.id,
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          categoryIdentifier: notification.category,
        },
        trigger: this.convertTrigger(notification.trigger),
      };

      await Notifications.scheduleNotificationAsync(request);
      console.log(`Local notification scheduled: ${notification.id}`);
    } catch (error) {
      throw errorHandler.handleError(error, 'scheduleLocalNotification');
    }
  }

  /**
   * Cancel a specific notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Notification cancelled: ${notificationId}`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel all notifications for a user
   */
  async cancelAllUserNotifications(_userId: string): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error cancelling user notifications:', error);
      throw error;
    }
  }

  /**
   * Get scheduled notifications for a user
   */
  async getScheduledNotifications(
    _userId: string,
  ): Promise<ScheduledNotification[]> {
    try {
      const localNotifications =
        await Notifications.getAllScheduledNotificationsAsync();

      return localNotifications
        .map(notif => {
          const triggerDate =
            notif.trigger && 'date' in notif.trigger
              ? new Date(notif.trigger.date)
              : new Date();
          return {
            id: notif.identifier,
            title: notif.content.title || '',
            body: notif.content.body || '',
            scheduledFor: triggerDate,
            data: notif.content.data as Record<string, unknown> | undefined,
          };
        })
        .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Convert our trigger interface to Expo's trigger format
   */
  private convertTrigger(
    trigger: NotificationTrigger,
  ): Notifications.NotificationTriggerInput {
    switch (trigger.type) {
      case 'date':
        return {
          type: 'date' as const,
          date: trigger.date ?? new Date(),
        } as Notifications.NotificationTriggerInput;
      case 'interval':
        return {
          type: 'timeInterval' as const,
          seconds: trigger.seconds ?? 0,
          repeats: false,
        } as Notifications.NotificationTriggerInput;
      case 'location':
        // Location triggers are not supported in Expo Notifications
        console.warn(
          'Location triggers are not supported in Expo Notifications',
        );
        return null;
      default:
        return null;
    }
  }

  /**
   * Set up notification categories for interactive notifications
   */
  async setupNotificationCategories(): Promise<void> {
    try {
      // Assignment category
      await Notifications.setNotificationCategoryAsync('assignment', [
        {
          identifier: 'complete',
          buttonTitle: '✓ Complete',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'snooze',
          buttonTitle: 'Snooze 1h',
          options: { opensAppToForeground: false },
        },
      ]);

      // SRS review category
      await Notifications.setNotificationCategoryAsync('srs_review', [
        {
          identifier: 'review_now',
          buttonTitle: '🧠 Review Now',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'snooze',
          buttonTitle: 'Later',
          options: { opensAppToForeground: false },
        },
      ]);

      // Daily summary category
      await Notifications.setNotificationCategoryAsync('daily_summary', [
        {
          identifier: 'view_tasks',
          buttonTitle: 'View Tasks',
          options: { opensAppToForeground: true },
        },
      ]);

      console.log('✅ Notification categories set up successfully');
    } catch (error) {
      console.error('Error setting up notification categories:', error);
    }
  }

  /**
   * Set up Android notification channels
   */
  async setupAndroidChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      // Create channel groups
      await Notifications.setNotificationChannelGroupAsync('tasks', {
        name: 'Tasks & Assignments',
        description: 'Notifications about your tasks and assignments',
      });

      await Notifications.setNotificationChannelGroupAsync('learning', {
        name: 'Learning & Reviews',
        description: 'Spaced repetition and study session reminders',
      });

      // Create channels
      await Notifications.setNotificationChannelAsync('assignments', {
        name: 'Assignments',
        description: 'Assignment due date reminders',
        importance: Notifications.AndroidImportance.HIGH,
        groupId: 'tasks',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
      });

      await Notifications.setNotificationChannelAsync('srs', {
        name: 'Spaced Repetition',
        description: 'Review reminders for better learning',
        importance: Notifications.AndroidImportance.DEFAULT,
        groupId: 'learning',
        vibrationPattern: [0, 250],
        lightColor: '#95E1D3',
      });

      console.log('✅ Android notification channels set up successfully');
    } catch (error) {
      console.error('Error setting up Android channels:', error);
    }
  }
}
