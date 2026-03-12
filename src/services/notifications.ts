import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { NavigationContainerRef } from '@react-navigation/native';
// Removed ReminderTime and RepeatPattern imports as they were deleted
import { NotificationPreferenceService } from '@/services/notifications/NotificationPreferenceService';
import { parseResponseJsonSafely } from '@/utils/safeJsonParser';
import {
  SimpleNotificationPreferences,
  SimpleNotificationPreferencesUpdate,
} from '@/services/notifications/interfaces/SimpleNotificationPreferences';
import { NotificationPreferences } from '@/services/notifications/interfaces/INotificationPreferenceService';
import { RootStackParamList } from '@/types/navigation';
import { Task } from '@/types/entities';

// Notification data interface
interface NotificationData {
  url?: string;
  itemId?: string;
  taskType?: 'lecture' | 'assignment' | 'study_session';
  [key: string]: unknown;
}

// Navigation reference for handling notification taps
let navigationRef: NavigationContainerRef<RootStackParamList> | null = null;

// Service locator pattern for accessing NotificationContext
let _setTaskToShow: (task: Task) => void;

export function setNotificationTaskHandler(handler: (task: Task) => void) {
  _setTaskToShow = handler;
}

// Helper function to get table name from task type
function getTableName(taskType: string): string {
  switch (taskType) {
    case 'lecture':
      return 'lectures';
    case 'assignment':
      return 'assignments';
    case 'study_session':
      return 'study_sessions';
    default:
      throw new Error(`Unknown task type: ${taskType}`);
  }
}

/**
 * Check if an error is a timeout error (HTTP 504)
 */
function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('504') ||
      message.includes('gateway timeout') ||
      message.includes('timeout') ||
      message.includes('http_504')
    );
  }
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as {
      code?: string;
      error?: string;
      message?: string;
    };
    return (
      errorObj.code === 'HTTP_504' ||
      (errorObj.error?.toLowerCase().includes('timeout') ?? false) ||
      (errorObj.message?.toLowerCase().includes('504') ?? false) ||
      (errorObj.message?.toLowerCase().includes('timeout') ?? false)
    );
  }
  return false;
}

/**
 * Check if an error is a worker/function error that might be retryable
 */
function isWorkerError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('worker_error') ||
      message.includes('function exited') ||
      message.includes('please check logs')
    );
  }
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as {
      code?: string;
      error?: string;
      message?: string;
    };
    return (
      errorObj.code === 'WORKER_ERROR' ||
      (errorObj.error?.toLowerCase().includes('function exited') ?? false) ||
      (errorObj.message?.toLowerCase().includes('function exited') ?? false)
    );
  }
  return false;
}

/**
 * Save push token to Supabase user_devices table with retry logic for timeouts
 * @param userId string
 * @param token string
 */
async function savePushTokenToSupabase(_userId: string, _token: string) {
  // Offline MVP — device registration not available
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Check if running in Expo Go or development build
const isExpoGo = Constants.appOwnership === 'expo';
const isDevClient = !isExpoGo;

/**
 * Send a test push notification using the Expo push API
 * @param token Expo push token
 * @param title Notification title
 * @param body Notification body
 */
export async function sendTestPushNotification(
  token: string,
  title = 'Test Notification',
  body = 'This is a test push notification.',
) {
  const message = {
    to: token,
    sound: 'default',
    title,
    body,
    data: { test: true },
  };
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    // Guard: Only parse JSON if response is ok and has JSON content-type
    let data: any = null;
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        try {
          // FIX: Use safe JSON parser to prevent crashes from empty/undefined responses
          data = await parseResponseJsonSafely(response);
          if (data === null) {
            // Empty response is valid - return success
            return { success: true };
          }
        } catch (error) {
          console.error(
            '❌ Failed to parse push notification response as JSON:',
            error instanceof Error ? error.message : String(error),
          );
          return { error: 'Invalid response format' };
        }
      }
    }

    if (data && data.data && data.data.status === 'ok') {
    } else {
      console.error('❌ Failed to send test push notification:', data);
    }
    return data || { error: 'No response data' };
  } catch (error) {
    console.error('❌ Error sending test push notification:', error);
    throw error;
  }
}

export const notificationService = {
  // Set navigation reference for handling notification taps
  setNavigationRef(ref: NavigationContainerRef<RootStackParamList> | null) {
    navigationRef = ref;
  },

  // Initialize notifications
  async initialize(userId: string) {
    // Skip push notification setup in Expo Go to avoid warnings
    if (isExpoGo) {
      await this.setupNotificationChannels();
      this.setupNotificationListeners();
      return;
    }

    // Only setup push notifications in development builds or production
    if (isDevClient || !__DEV__) {
      await this.registerForPushNotifications(userId);
    }

    await this.setupNotificationChannels();
    this.setupNotificationListeners();
  },

  // Register for push notifications
  async registerForPushNotifications(userId: string) {
    let token;

    if (!Device.isDevice) {
      console.warn('📱 Must use a physical device for Push Notifications');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('❌ Failed to get push token for push notification!');
      return null;
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      // Ensure we extract the string token, not the full object
      token = tokenData?.data;

      if (!token || typeof token !== 'string') {
        console.warn('❌ Invalid push token received:', tokenData);
        return null;
      }

      // Store token for future use
      await AsyncStorage.setItem('pushToken', token);

      // Save token to Supabase (guard already in savePushTokenToSupabase)
      if (userId && token) {
        await savePushTokenToSupabase(userId, token);
      }

      return token;
    } catch (error) {
      console.error('❌ Error getting push token:', error);
      return null;
    }
  },

  // Setup notification channels for Android
  async setupNotificationChannels() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2C5EFF',
        description: 'Notifications for study sessions, tasks, and events',
      });

      await Notifications.setNotificationChannelAsync('spaced_repetition', {
        name: 'Spaced Repetition',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
        description: 'Spaced repetition review reminders',
      });
    }
  },

  // Setup notification listeners
  setupNotificationListeners() {
    Notifications.addNotificationReceivedListener(notification => {});

    Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      this.handleNotificationTap(data);
    });
  },

  // Handle notification tap with deep linking support
  async handleNotificationTap(data: NotificationData) {
    const { url, itemId, taskType } = data;

    // If a deep link URL is provided, use it
    if (url) {
      console.log('Handling notification with deep link:', url);
      try {
        // Check if navigation is ready before navigating
        if (navigationRef && navigationRef.isReady()) {
          // Navigate using the deep link
          navigationRef.navigate(url as never);
          console.log('Successfully navigated to:', url);
        } else {
          console.warn(
            'Navigation not ready, queuing navigation for deep link:',
            url,
          );
          // Queue navigation for when it becomes ready
          const checkInterval = setInterval(() => {
            if (navigationRef && navigationRef.isReady()) {
              clearInterval(checkInterval);
              try {
                navigationRef.navigate(url as never);
                console.log('Successfully navigated to queued deep link:', url);
              } catch (error) {
                console.error('Error navigating to queued deep link:', error);
                // Fallback to legacy method if queued navigation fails
                this.handleNotificationTapLegacy(data).catch(() => {});
              }
            }
          }, 100);

          // Clear interval after 5 seconds to prevent infinite checking
          setTimeout(() => {
            clearInterval(checkInterval);
            // Fallback to legacy method if navigation doesn't become ready
            this.handleNotificationTapLegacy(data).catch(() => {});
          }, 5000);
        }
      } catch (error) {
        console.error('Error navigating with deep link:', error);
        // Fallback to old method if deep link fails
        await this.handleNotificationTapLegacy(data);
      }
      return;
    }

    // Fallback to legacy method if no URL is provided
    console.log('No deep link URL found, using legacy navigation');
    await this.handleNotificationTapLegacy(data);
  },

  // Legacy notification tap handler (fallback)
  async handleNotificationTapLegacy(data: NotificationData) {
    const { itemId, taskType } = data;

    if (!itemId || !taskType) {
      console.warn('Missing itemId or taskType in notification data');
      return;
    }

    try {
      // Offline mode — cannot fetch task from DB
      console.warn(
        'handleNotificationTapLegacy: not available in offline mode',
      );
    } catch (error) {
      console.error('Error handling notification tap:', error);
    }
  },

  /**
   * @deprecated This function is deprecated. Use the `useNotificationPreferences` hook instead.
   * This function reads from AsyncStorage which is no longer the source of truth.
   * Use the new notification preferences system backed by the database.
   */
  async areNotificationsEnabled(): Promise<boolean> {
    const settings = await AsyncStorage.getItem('notificationSettings');
    if (!settings) return true;

    // Guard: Only parse if settings is valid
    if (settings.trim() && settings !== 'undefined' && settings !== 'null') {
      try {
        const parsed = JSON.parse(settings);
        return parsed.enabled !== false;
      } catch {
        // If parse fails, default to enabled
        return true;
      }
    }
    return true;
  },

  /**
   * @deprecated This function is deprecated. Use the `useNotificationPreferences` hook instead.
   * This function writes to AsyncStorage which is no longer the source of truth.
   * Use the new notification preferences system backed by the database.
   */
  async setNotificationsEnabled(enabled: boolean) {
    await AsyncStorage.setItem(
      'notificationSettings',
      JSON.stringify({ enabled }),
    );
    if (!enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  },

  async scheduleReminder({
    id,
    title,
    body,
    triggerDate,
    type = 'reminder',
    data = {},
  }: {
    id: string;
    title: string;
    body: string;
    triggerDate: Date;
    type?: 'reminder' | 'spaced_repetition';
    data?: Record<string, unknown>;
  }) {
    const enabled = await this.areNotificationsEnabled();
    if (!enabled) return;

    const now = new Date();
    if (triggerDate <= now) return;

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
          title,
          body,
          data: { ...data, type },
          sound: true,
        },
        trigger: {
          type: 'date' as const,
          date: triggerDate,
        } as Notifications.NotificationTriggerInput,
      });
    } catch (error) {
      console.error('❌ Failed to schedule notification:', error);
    }
  },

  // scheduleItemReminders removed - uses deleted ReminderTime type

  async cancelItemReminders(itemId: string) {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduledNotifications) {
      const data = notification.content.data;
      if (
        data?.itemId === itemId ||
        notification.identifier.startsWith(itemId)
      ) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier,
        );
      }
    }
  },

  async cancelSRReminders(sessionId: string) {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduledNotifications) {
      if (notification.identifier.startsWith(`sr_${sessionId}`)) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier,
        );
      }
    }
  },

  async rescheduleSRReminders({
    sessionId,
    sessionTitle,
    newDate,
    planType,
    userId,
  }: {
    sessionId: string;
    sessionTitle: string;
    newDate: Date;
    planType: 'origin' | 'oddity';
    userId: string;
  }) {
    try {
      // Cancel existing reminders first
      await this.cancelSRReminders(sessionId);

      // Offline mode — DB reminder rescheduling not available
      console.log(
        `Reminder rescheduling skipped for session ${sessionId} (offline mode)`,
      );
    } catch (error) {
      console.error('❌ Exception in rescheduleSRReminders:', error);
      // Don't throw - allow the update to proceed even if reminder rescheduling fails
    }
  },

  // Functions using deleted types removed:
  // - scheduleRepeatingReminders
  // - generateRepeatOccurrences
  // - getNextCustomDay
  // - calculateReminderTime
  // - getReminderTimeText

  async getScheduledNotificationsCount(): Promise<number> {
    const notifications =
      await Notifications.getAllScheduledNotificationsAsync();
    return notifications.length;
  },

  async clearAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  async sendTestNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'ELARO Test',
        body: 'This is a test notification',
        data: { test: true },
      },
      trigger: null,
    });
  },

  // Preferences proxy exposing a simplified interface used by UI components
  preferences: {
    async getUserPreferences(
      userId: string,
    ): Promise<SimpleNotificationPreferences> {
      const svc = NotificationPreferenceService.getInstance();
      const fullPrefs = await svc.getUserPreferences(userId);
      return mapFullToSimple(userId, fullPrefs);
    },

    async updateUserPreferences(
      userId: string,
      update: SimpleNotificationPreferencesUpdate,
    ): Promise<void> {
      const svc = NotificationPreferenceService.getInstance();
      const fullUpdate = mapSimpleUpdateToFull(update);
      await svc.updatePreferences(userId, fullUpdate);
    },
  },

  async getScheduledNotifications(userId: string) {
    // Proxy to delivery service if available, otherwise return empty array
    try {
      const notifications =
        await Notifications.getAllScheduledNotificationsAsync();
      return notifications.map(notif => ({
        id: notif.identifier,
        title: notif.content.title || '',
        body: notif.content.body || '',
        scheduledFor: notif.trigger
          ? typeof notif.trigger === 'number' ||
            typeof notif.trigger === 'string'
            ? new Date(notif.trigger)
            : new Date()
          : new Date(),
        category: notif.content.data?.category || 'reminder',
      }));
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  },

  async cancelNotification(notificationId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
      throw error;
    }
  },

  async sendSmartNotification(
    userId: string,
    title: string,
    body: string,
    type: string,
    priority: string,
  ) {
    // Use the existing sendTestNotification for now
    try {
      await this.sendTestNotification();
      return true;
    } catch (error) {
      console.error('Error sending smart notification:', error);
      return false;
    }
  },
};

// ======================
// Mapping helpers
// ======================
function mapFullToSimple(
  userId: string,
  prefs: NotificationPreferences,
): SimpleNotificationPreferences {
  return {
    enabled: prefs.masterToggle && !prefs.doNotDisturb,
    reminders: prefs.notificationTypes.reminders || prefs.notificationTypes.srs,
    assignments: prefs.notificationTypes.assignments,
    lectures: prefs.notificationTypes.lectures,
    studySessions: prefs.notificationTypes.srs,
    dailySummaries: prefs.notificationTypes.dailySummaries,
    marketing: prefs.notificationTypes.marketing,
    quietHours: {
      enabled: prefs.quietHours.enabled,
      start: prefs.quietHours.start,
      end: prefs.quietHours.end,
    },
    userId,
    updatedAt: prefs.updatedAt,
  };
}

function mapSimpleUpdateToFull(
  update: SimpleNotificationPreferencesUpdate,
): Partial<NotificationPreferences> {
  const full: Partial<NotificationPreferences> = {};

  if (update.enabled !== undefined) {
    full.masterToggle = update.enabled;
    // Do not change doNotDisturb automatically
  }

  if (
    update.reminders !== undefined ||
    update.assignments !== undefined ||
    update.lectures !== undefined ||
    update.studySessions !== undefined ||
    update.dailySummaries !== undefined ||
    update.marketing !== undefined
  ) {
    full.notificationTypes = {
      reminders: update.reminders ?? false,
      achievements: false,
      updates: false,
      marketing: update.marketing ?? false,
      assignments: update.assignments ?? false,
      lectures: update.lectures ?? false,
      srs: update.studySessions ?? update.reminders ?? false,
      dailySummaries: update.dailySummaries ?? false,
    };
  }

  if (update.quietHours) {
    full.quietHours = {
      enabled: update.quietHours.enabled ?? false,
      start: update.quietHours.start ?? '22:00',
      end: update.quietHours.end ?? '08:00',
    };
  }

  return full;
}
