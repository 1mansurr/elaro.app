import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import notificationService from '@/services/notificationService';

interface UsePushNotificationsReturn {
  registerForPushNotifications: () => Promise<void>;
  isLoading: boolean;
  isRegistered: boolean;
  error: string | null;
  hasPermission: boolean;
}

/**
 * React hook for managing push notifications registration and permissions.
 * Provides a clean interface for components to interact with the notification system.
 */
export const usePushNotifications = (): UsePushNotificationsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  /**
   * Checks if the user has granted notification permissions.
   */
  const checkPermissions = useCallback(async () => {
    try {
      const granted = await notificationService.getPermissions();
      setHasPermission(granted);
      return granted;
    } catch (err) {
      console.error('Error checking notification permissions:', err);
      setError('Failed to check notification permissions');
      return false;
    }
  }, []);

  /**
   * Registers the device for push notifications.
   * This includes requesting permissions and getting the push token.
   */
  const registerForPushNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Check and request permissions
      const permissionGranted = await checkPermissions();
      if (!permissionGranted) {
        setError('Notification permissions not granted');
        return;
      }

      // Step 2: Get the push token
      const token = await notificationService.getPushToken();
      if (!token) {
        setError('Failed to retrieve push token');
        return;
      }

      // savePushToken skipped in offline MVP

      setIsRegistered(true);
      console.log('Successfully registered for push notifications');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error during push notification registration:', err);
    } finally {
      setIsLoading(false);
    }
  }, [checkPermissions]);

  /**
   * Handles notification taps by extracting task information and calling the appropriate handler.
   */
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      try {
        const data = response.notification.request.content.data;

        // Check if a deep link URL is provided
        if (data?.url) {
          console.log('Notification tapped with deep link:', data.url);
          console.log('Deep link will be handled by notificationService');
          return;
        }

        // Fallback to old behavior for notifications without deep links
        if (data?.taskId && data?.taskType) {
          console.log(
            'Notification tapped for task:',
            data.taskId,
            data.taskType,
          );
        } else if (data?.reminderId) {
          console.log('Reminder notification tapped:', data.reminderId);
        } else {
          console.log('Generic notification tapped');
        }
      } catch (err) {
        console.error('Error handling notification response:', err);
      }
    },
    [],
  );

  /**
   * Handles notifications received while the app is in the foreground.
   */
  const handleNotificationReceived = useCallback(
    (notification: Notifications.Notification) => {
      console.log('Notification received:', notification);
    },
    [],
  );

  // Set up notification listeners when the hook is first used
  useEffect(() => {
    const responseSubscription =
      notificationService.addNotificationResponseListener(
        handleNotificationResponse,
      );

    const receivedSubscription = notificationService.addNotificationListener(
      handleNotificationReceived,
    );

    return () => {
      if (responseSubscription) responseSubscription();
      if (receivedSubscription) receivedSubscription();
    };
  }, [handleNotificationResponse, handleNotificationReceived]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    registerForPushNotifications,
    isLoading,
    isRegistered,
    error,
    hasPermission,
  };
};

/**
 * Simplified hook that only handles the registration process.
 * Use this when you just need to register for notifications without managing state.
 */
export const useSimplePushNotifications = () => {
  const [isLoading, setIsLoading] = useState(false);

  const registerForPushNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const hasPermission = await notificationService.getPermissions();
      if (!hasPermission) {
        console.log('User did not grant notification permissions.');
        return;
      }

      const token = await notificationService.getPushToken();
      if (!token) {
        console.log('Could not retrieve push token.');
        return;
      }

      // savePushToken skipped in offline MVP
      console.log('Successfully registered for push notifications');
    } catch (error) {
      console.error(
        'An error occurred during push notification registration:',
        error,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    registerForPushNotifications,
    isLoading,
  };
};
