import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import notificationService from '@/services/notificationService';
import { useAuth } from '@/features/auth/contexts/AuthContext';

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
  const { user } = useAuth();
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
   * This includes requesting permissions, getting the push token, and saving it to the backend.
   */
  const registerForPushNotifications = useCallback(async () => {
    if (!user) {
      setError('User must be logged in to register for notifications');
      return;
    }

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

      // Step 3: Save the token to the backend
      await notificationService.savePushToken(user.id, token);
      
      setIsRegistered(true);
      console.log('Successfully registered for push notifications');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error during push notification registration:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, checkPermissions]);

  /**
   * Handles notification taps by extracting task information and calling the appropriate handler.
   */
  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    try {
      const data = response.notification.request.content.data;
      
      // Check if a deep link URL is provided
      if (data?.url) {
        console.log('Notification tapped with deep link:', data.url);
        
        // The notificationService will handle the navigation
        // Just log for debugging
        console.log('Deep link will be handled by notificationService');
        return;
      }
      
      // Fallback to old behavior for notifications without deep links
      if (data?.taskId && data?.taskType) {
        // This is a task-related notification
        console.log('Notification tapped for task:', data.taskId, data.taskType);
        
        // You can dispatch navigation actions or update app state here
        // For example, navigate to the task detail screen
        // navigation.navigate('TaskDetailModal', { 
        //   taskId: data.taskId, 
        //   taskType: data.taskType 
        // });
      } else if (data?.reminderId) {
        // This is a reminder notification
        console.log('Reminder notification tapped:', data.reminderId);
      } else {
        // Generic notification
        console.log('Generic notification tapped');
      }
    } catch (err) {
      console.error('Error handling notification response:', err);
    }
  }, []);

  /**
   * Handles notifications received while the app is in the foreground.
   */
  const handleNotificationReceived = useCallback((notification: Notifications.Notification) => {
    console.log('Notification received:', notification);
    
    // You can customize the behavior here, such as:
    // - Showing a custom in-app notification
    // - Updating app state
    // - Playing custom sounds
  }, []);

  // Set up notification listeners when the hook is first used
  useEffect(() => {
    let responseSubscription: any;
    let receivedSubscription: any;

    if (user) {
      // Set up notification response listener (when user taps notification)
      responseSubscription = notificationService.addNotificationResponseListener(handleNotificationResponse);
      
      // Set up notification received listener (when app is in foreground)
      receivedSubscription = notificationService.addNotificationListener(handleNotificationReceived);
    }

    // Cleanup listeners on unmount
    return () => {
      if (responseSubscription) {
        responseSubscription();
      }
      if (receivedSubscription) {
        receivedSubscription();
      }
    };
  }, [user, handleNotificationResponse, handleNotificationReceived]);

  // Check permissions when user changes
  useEffect(() => {
    if (user) {
      checkPermissions();
    } else {
      setHasPermission(false);
      setIsRegistered(false);
    }
  }, [user, checkPermissions]);

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
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const registerForPushNotifications = useCallback(async () => {
    if (!user) return;
    
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

      await notificationService.savePushToken(user.id, token);
      console.log('Successfully registered for push notifications');
    } catch (error) {
      console.error('An error occurred during push notification registration:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    registerForPushNotifications,
    isLoading,
  };
};
