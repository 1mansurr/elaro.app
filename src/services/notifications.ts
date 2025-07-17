import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { ReminderTime, RepeatPattern } from '../types';
import { analyticsService } from './supabase';

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

// Spaced Repetition Intervals
const SRS_INTERVALS = {
  origin: [0, 1, 3],
  oddity: [0, 1, 3, 7, 14, 30, 60, 120, 180],
};

export const notificationService = {
  // Initialize notifications
  async initialize() {
    // Skip push notification setup in Expo Go to avoid warnings
    if (isExpoGo) {
      console.log('📱 Running in Expo Go - skipping push notification setup');
      await this.setupNotificationChannels();
      this.setupNotificationListeners();
      return;
    }

    // Only setup push notifications in development builds or production
    if (isDevClient || !__DEV__) {
    await this.registerForPushNotifications();
    }
    
    await this.setupNotificationChannels();
    this.setupNotificationListeners();
  },

  // Register for push notifications
  async registerForPushNotifications() {
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

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
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
      console.log('✅ Expo Push Token:', token);

    // Store token for future use
    await AsyncStorage.setItem('pushToken', token);

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
      console.log('📨 Notification received:', notification);
    });

    Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      this.handleNotificationTap(data);
    });
  },

  // Handle notification tap
  handleNotificationTap(data: any) {
    console.log('👆 Notification tapped:', data);
    // TODO: Navigate to appropriate screen based on notification data
    // This will be implemented when navigation is available in the notification context
  },

  async areNotificationsEnabled(): Promise<boolean> {
    const settings = await AsyncStorage.getItem('notificationSettings');
    if (!settings) return true;

    const parsed = JSON.parse(settings);
    return parsed.enabled !== false;
  },

  async setNotificationsEnabled(enabled: boolean) {
    await AsyncStorage.setItem('notificationSettings', JSON.stringify({ enabled }));
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
        trigger: triggerDate,
      });
      console.log('✅ Scheduled notification:', id, 'for', triggerDate);
    } catch (error) {
      console.error('❌ Failed to schedule notification:', error);
    }
  },

  async scheduleItemReminders({
    itemId,
    itemTitle,
    itemType,
    dateTime,
    reminderTimes,
  }: {
    itemId: string;
    itemTitle: string;
    itemType: string;
    dateTime: Date;
    reminderTimes: ReminderTime[];
  }) {
    for (const reminderTime of reminderTimes) {
      const triggerDate = this.calculateReminderTime(dateTime, reminderTime);
      const reminderId = `${itemId}_${reminderTime}`;

      await this.scheduleReminder({
        id: reminderId,
        title: `📌 Reminder: ${itemTitle}`,
        body: `${itemType} ${this.getReminderTimeText(reminderTime)}`,
        triggerDate,
        data: { itemId, itemType, reminderTime },
      });
    }
  },

  async scheduleSRReminders({
    sessionId,
    sessionTitle,
    studyDate,
    planType,
    userId,
  }: {
    sessionId: string;
    sessionTitle: string;
    studyDate: Date;
    planType: 'origin' | 'oddity';
    userId: string;
  }) {
    const intervals = SRS_INTERVALS[planType];

    for (let i = 0; i < intervals.length; i++) {
      const dayOffset = intervals[i];
      const triggerDate = new Date(studyDate);
      triggerDate.setDate(triggerDate.getDate() + dayOffset);
      triggerDate.setHours(9, 0, 0, 0);

      const reminderId = `sr_${sessionId}_day${dayOffset}`;

      await this.scheduleReminder({
        id: reminderId,
        title: '🧠 Time to review',
        body: `Day ${dayOffset} review: ${sessionTitle}`,
        triggerDate,
        type: 'spaced_repetition',
        data: { sessionId, dayOffset, userId },
      });
    }

    await analyticsService.logEvent(userId, 'add_session', {
      spaced_repetition: true,
      plan_type: planType,
      intervals_count: intervals.length,
    });
  },

  async cancelItemReminders(itemId: string) {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduledNotifications) {
      const data = notification.content.data;
      if (data?.itemId === itemId || notification.identifier.startsWith(itemId)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  },

  async cancelSRReminders(sessionId: string) {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduledNotifications) {
      if (notification.identifier.startsWith(`sr_${sessionId}`)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
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
    await this.scheduleSRReminders({
      sessionId,
      sessionTitle,
      studyDate: newDate,
      planType,
      userId,
    });
  },

  async scheduleRepeatingReminders({
    itemId,
    itemTitle,
    startDate,
    repeatPattern,
    reminderTimes,
    endDate,
  }: {
    itemId: string;
    itemTitle: string;
    startDate: Date;
    repeatPattern: RepeatPattern;
    reminderTimes: ReminderTime[];
    endDate?: Date;
  }) {
    const occurrences = this.generateRepeatOccurrences(startDate, repeatPattern, endDate);
    for (let i = 0; i < occurrences.length; i++) {
      const occurrence = occurrences[i];
      const occurrenceId = `${itemId}_occurrence_${i}`;
      await this.scheduleItemReminders({
        itemId: occurrenceId,
        itemTitle,
        itemType: 'Lecture',
        dateTime: occurrence,
        reminderTimes,
      });
    }
  },

  generateRepeatOccurrences(
    startDate: Date,
    repeatPattern: RepeatPattern,
    endDate?: Date
  ): Date[] {
    const occurrences: Date[] = [];
    const maxOccurrences = 52;
    const finalEndDate = endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    let currentDate = new Date(startDate);

    for (let i = 0; i < maxOccurrences && currentDate <= finalEndDate; i++) {
      occurrences.push(new Date(currentDate));
      if (repeatPattern.type === 'daily') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (repeatPattern.type === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (repeatPattern.type === 'custom' && repeatPattern.days) {
        currentDate = this.getNextCustomDay(currentDate, repeatPattern.days);
      }
    }

    return occurrences;
  },

  getNextCustomDay(currentDate: Date, days: number[]): Date {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    while (!days.includes(nextDate.getDay())) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    return nextDate;
  },

  calculateReminderTime(dateTime: Date, reminderTime: ReminderTime): Date {
    const triggerDate = new Date(dateTime);
    switch (reminderTime) {
      case '30min':
        triggerDate.setMinutes(triggerDate.getMinutes() - 30);
        break;
      case '24hr':
        triggerDate.setHours(triggerDate.getHours() - 24);
        break;
      case '1week':
        triggerDate.setDate(triggerDate.getDate() - 7);
        break;
    }
    return triggerDate;
  },

  getReminderTimeText(reminderTime: ReminderTime): string {
    switch (reminderTime) {
      case '30min':
        return 'starts in 30 minutes';
      case '24hr':
        return 'is tomorrow';
      case '1week':
        return 'is in one week';
      default:
        return 'is coming up';
    }
  },

  async getScheduledNotificationsCount(): Promise<number> {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
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
