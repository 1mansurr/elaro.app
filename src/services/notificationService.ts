import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

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

/**
 * Centralized notification service for all client-side push notification operations.
 * This service abstracts all expo-notifications functionality and provides
 * a clean, consistent API for the rest of the application.
 */
const notificationService = {
  /**
   * Checks and requests notification permissions from the user.
   * Sets up Android notification channel if needed.
   * @returns {Promise<boolean>} - True if permissions are granted, false otherwise.
   */
  async getPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error getting notification permissions:', error);
      return false;
    }
  },

  /**
   * Gets the Expo Push Token for the current device.
   * @returns {Promise<string | null>} - The push token, or null if it could not be retrieved.
   */
  async getPushToken(): Promise<string | null> {
    try {
      // Get project ID from Expo config
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      if (!projectId) {
        // Fallback: try to get from legacy config structure
        const legacyProjectId = Constants.expoConfig?.extra?.eas?.projectId || 
                               Constants.manifest?.extra?.eas?.projectId;
        
        if (!legacyProjectId) {
          throw new Error('EAS project ID not found in app config. Make sure your app.config.js includes the eas.projectId.');
        }
        
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: legacyProjectId });
        return tokenData.data;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      return tokenData.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  },

  /**
   * Saves the user's push token to the backend database.
   * @param {string} userId - The ID of the current user.
   * @param {string} token - The push token to save.
   * @returns {Promise<void>}
   */
  async savePushToken(userId: string, token: string): Promise<void> {
    try {
      const platform = Platform.OS;
      const updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('user_devices')
        .upsert(
          {
            user_id: userId,
            push_token: token,
            platform,
            updated_at,
          },
          { onConflict: 'user_id,platform' }
        );

      if (error) {
        throw error;
      }
      
      console.log('Push token saved successfully to user_devices table.');
    } catch (error) {
      console.error('Error saving push token:', error);
      throw error; // Re-throw to allow calling code to handle the error
    }
  },

  /**
   * Registers a notification listener for handling notification taps.
   * @param {Function} listener - The function to call when a notification is tapped.
   * @returns {Function} - Cleanup function to remove the listener.
   */
  addNotificationListener(listener: (notification: Notifications.Notification) => void): () => void {
    const subscription = Notifications.addNotificationReceivedListener(listener);
    
    return () => {
      subscription.remove();
    };
  },

  /**
   * Registers a response listener for handling notification interactions.
   * @param {Function} listener - The function to call when a notification is tapped.
   * @returns {Function} - Cleanup function to remove the listener.
   */
  addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(listener);
    
    return () => {
      subscription.remove();
    };
  },

  /**
   * Cancels all scheduled notifications.
   * @returns {Promise<void>}
   */
  async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All scheduled notifications cancelled.');
    } catch (error) {
      console.error('Error cancelling scheduled notifications:', error);
    }
  },

  /**
   * Schedules a local notification.
   * @param {Object} notification - The notification to schedule.
   * @returns {Promise<string>} - The notification ID.
   */
  async scheduleLocalNotification(notification: {
    title: string;
    body: string;
    data?: any;
    trigger?: Notifications.NotificationTriggerInput;
  }): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
        },
        trigger: notification.trigger,
      });
      
      console.log(`Local notification scheduled with ID: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  },

  /**
   * Cancels a specific scheduled notification.
   * @param {string} notificationId - The ID of the notification to cancel.
   * @returns {Promise<void>}
   */
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Scheduled notification ${notificationId} cancelled.`);
    } catch (error) {
      console.error('Error cancelling scheduled notification:', error);
    }
  },

  /**
   * Gets all scheduled notifications.
   * @returns {Promise<Notifications.NotificationRequest[]>}
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  },

  /**
   * Sets the badge count for the app icon.
   * @param {number} count - The badge count to set.
   * @returns {Promise<void>}
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  },

  /**
   * Gets the current badge count.
   * @returns {Promise<number>}
   */
  async getBadgeCount(): Promise<number> {
    try {
      const count = await Notifications.getBadgeCountAsync();
      return count;
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  },
};

export default notificationService;
