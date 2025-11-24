/**
 * Interface for notification delivery operations
 * Handles sending push notifications and managing local notifications
 */
export interface INotificationDeliveryService {
  /**
   * Send a push notification to a user
   */
  sendPushNotification(
    userId: string,
    notification: NotificationPayload,
  ): Promise<DeliveryResult>;

  /**
   * Schedule a local notification
   */
  scheduleLocalNotification(notification: LocalNotification): Promise<void>;

  /**
   * Cancel a specific notification
   */
  cancelNotification(notificationId: string): Promise<void>;

  /**
   * Cancel all notifications for a user
   */
  cancelAllUserNotifications(userId: string): Promise<void>;

  /**
   * Get scheduled notifications for a user
   */
  getScheduledNotifications(userId: string): Promise<ScheduledNotification[]>;

  /**
   * Setup notification categories (optional)
   */
  setupNotificationCategories?(): Promise<void>;

  /**
   * Setup Android channels (optional)
   */
  setupAndroidChannels?(): Promise<void>;

  /**
   * Set navigation reference (optional)
   */
  setNavigationRef?(ref: unknown): void;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  category?: string;
  priority?: 'low' | 'normal' | 'high';
  sound?: boolean;
  badge?: number;
}

export interface LocalNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  trigger: NotificationTrigger;
  category?: string;
}

export interface NotificationTrigger {
  type: 'date' | 'interval' | 'location';
  date?: Date;
  seconds?: number;
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledFor: Date;
  category?: string;
  data?: Record<string, unknown>;
}

export interface DeliveryResult {
  success: boolean;
  notificationId?: string;
  error?: string;
  deliveryTime?: Date;
}
