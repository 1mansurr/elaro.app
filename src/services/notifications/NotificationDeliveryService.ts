import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { supabase } from '@/services/supabase';
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
import { isWithinQuietHoursFrontend } from './utils/timezone-helpers';
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
    userId: string,
    notification: NotificationPayload,
  ): Promise<DeliveryResult> {
    try {
      // Validate input
      if (!userId || !notification.title || !notification.body) {
        throw errorHandler.createError(
          'Invalid input: userId, title, and body are required',
          ERROR_CODES.INVALID_INPUT,
        );
      }

      // Check if user has notifications enabled and quiet hours
      const { data: preferences, error: prefError } = await supabase
        .from('notification_preferences')
        .select(
          'master_toggle, do_not_disturb, quiet_hours_enabled, quiet_hours_start, quiet_hours_end',
        )
        .eq('user_id', userId)
        .single();

      if (prefError && prefError.code !== 'PGRST116') {
        // PGRST116 = not found
        throw errorHandler.handleError(prefError, 'getUserPreferences');
      }

      if (!preferences?.master_toggle || preferences?.do_not_disturb) {
        return {
          success: false,
          error: 'Notifications disabled or do not disturb enabled',
        };
      }

      // Check quiet hours if enabled
      if (
        preferences?.quiet_hours_enabled &&
        preferences?.quiet_hours_start &&
        preferences?.quiet_hours_end
      ) {
        // Get user timezone from profile
        const { data: userProfile } = await supabase
          .from('users')
          .select('timezone')
          .eq('id', userId)
          .single();

        const userTimezone = userProfile?.timezone || 'UTC';

        // Use timezone helper for consistent calculation
        if (
          isWithinQuietHoursFrontend(
            preferences.quiet_hours_enabled,
            preferences.quiet_hours_start,
            preferences.quiet_hours_end,
            userTimezone,
            new Date(),
          )
        ) {
          return {
            success: false,
            error:
              'Notification scheduled during quiet hours. It will be sent after quiet hours end.',
          };
        }
      }

      // Get user's push token
      const { data: device, error: deviceError } = await supabase
        .from('user_devices')
        .select('push_token')
        .eq('user_id', userId)
        .eq('platform', Platform.OS)
        .single();

      if (deviceError) {
        throw errorHandler.handleError(deviceError, 'getDeviceToken');
      }

      if (!device?.push_token) {
        throw errorHandler.createError(
          'No push token found for user',
          ERROR_CODES.DELIVERY_FAILED,
        );
      }

      // Send via Supabase function
      const { data, error } = await supabase.functions.invoke(
        'notification-system',
        {
          body: {
            action: 'send',
            user_id: userId,
            title: notification.title,
            body: notification.body,
            data: notification.data,
            category: notification.category,
            priority: notification.priority,
            sound: notification.sound,
            badge: notification.badge,
          },
        },
      );

      if (error) {
        throw errorHandler.handleError(error, 'sendNotification');
      }

      return {
        success: true,
        notificationId: data.notification_id,
        deliveryTime: new Date(),
      };
    } catch (error) {
      const notificationError = errorHandler.handleError(
        error,
        'sendPushNotification',
      );

      return {
        success: false,
        error: notificationError.message,
      };
    }
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
  async cancelAllUserNotifications(userId: string): Promise<void> {
    try {
      // Cancel all local notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Cancel scheduled notifications in database
      const { error } = await supabase
        .from('notification_queue')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) {
        throw error;
      }

      console.log(`All notifications cancelled for user: ${userId}`);
    } catch (error) {
      console.error('Error cancelling user notifications:', error);
      throw error;
    }
  }

  /**
   * Get scheduled notifications for a user
   */
  async getScheduledNotifications(
    userId: string,
  ): Promise<ScheduledNotification[]> {
    try {
      // Get local notifications
      const localNotifications =
        await Notifications.getAllScheduledNotificationsAsync();

      // Get database scheduled notifications
      const { data: dbNotifications } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true });

      const scheduledNotifications: ScheduledNotification[] = [];

      // Convert local notifications
      localNotifications.forEach(notif => {
        const triggerDate =
          notif.trigger && 'date' in notif.trigger
            ? new Date(notif.trigger.date)
            : new Date();
        scheduledNotifications.push({
          id: notif.identifier,
          title: notif.content.title || '',
          body: notif.content.body || '',
          scheduledFor: triggerDate,
          category: notif.content.categoryIdentifier,
          data: notif.content.data as Record<string, unknown> | undefined,
        });
      });

      // Convert database notifications
      interface DbNotification {
        id: string;
        title: string;
        body: string;
        scheduled_for: string;
        notification_type: string;
        data?: Record<string, unknown>;
      }
      dbNotifications?.forEach((notif: DbNotification) => {
        scheduledNotifications.push({
          id: notif.id,
          title: notif.title,
          body: notif.body,
          scheduledFor: new Date(notif.scheduled_for),
          category: notif.notification_type,
          data: notif.data,
        });
      });

      return scheduledNotifications.sort(
        (a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime(),
      );
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
        return { date: trigger.date };
      case 'interval':
        return { seconds: trigger.seconds };
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
