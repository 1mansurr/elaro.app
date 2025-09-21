import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
// Removed ReminderTime and RepeatPattern imports as they were deleted
import { analyticsService } from './supabase';
import { supabase } from './supabase';

// Navigation reference for handling notification taps
let navigationRef: any = null;

/**
 * Save push token to Supabase user_devices table
 * @param userId string
 * @param token string
 */
async function savePushTokenToSupabase(userId: string, token: string) {
  const platform = Platform.OS;
  const updated_at = new Date().toISOString();
  const { error } = await supabase.from('user_devices').upsert(
    [
      {
        user_id: userId,
        push_token: token,
        platform,
        updated_at,
      },
    ],
    { onConflict: 'user_id,platform' },
  );
  if (error) {
    console.error('❌ Error saving push token to Supabase:', error);
  }
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
    const data = await response.json();
    if (data.data && data.data.status === 'ok') {
    } else {
      console.error('❌ Failed to send test push notification:', data);
    }
    return data;
  } catch (error) {
    console.error('❌ Error sending test push notification:', error);
    throw error;
  }
}

export const notificationService = {
  // Set navigation reference for handling notification taps
  setNavigationRef(ref: any) {
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
      token = (await Notifications.getExpoPushTokenAsync()).data;

      // Store token for future use
      await AsyncStorage.setItem('pushToken', token);

      // Save token to Supabase
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
    Notifications.addNotificationReceivedListener(notification => {
    });

    Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      this.handleNotificationTap(data);
    });
  },

  // Handle notification tap
  handleNotificationTap(data: any) {
    if (!navigationRef) {
      console.warn('Navigation reference not set in notificationService.');
      return;
    }

    const { type, itemId } = data;

    // Ensure type is one of the expected values before navigating
    if (type === 'study_session' || type === 'lecture' || type === 'assignment') {
      navigationRef.navigate('TaskDetailModal', {
        taskId: itemId,
        taskType: type,
      });
    } else {
      // Fallback for other notification types
      console.warn(`Unhandled notification type: ${type}. Navigating to Home.`);
      navigationRef.navigate('Home');
    }
  },

  async areNotificationsEnabled(): Promise<boolean> {
    const settings = await AsyncStorage.getItem('notificationSettings');
    if (!settings) return true;

    const parsed = JSON.parse(settings);
    return parsed.enabled !== false;
  },

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
    data?: any;
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
          type: SchedulableTriggerInputTypes.DATE,
          date: triggerDate.getTime(),
        },
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
    await this.cancelSRReminders(sessionId);
    await this.rescheduleSRReminders({
      sessionId,
      sessionTitle,
      newDate: newDate,
      planType,
      userId,
    });
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
};
