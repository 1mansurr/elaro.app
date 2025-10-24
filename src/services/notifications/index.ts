// Export all interfaces
export * from './interfaces/INotificationDeliveryService';
export * from './interfaces/INotificationPreferenceService';
export * from './interfaces/INotificationSchedulingService';
export * from './interfaces/SimpleNotificationPreferences';

// Export all services
export { NotificationDeliveryService } from './NotificationDeliveryService';
export { NotificationPreferenceService } from './NotificationPreferenceService';
export { NotificationSchedulingService } from './NotificationSchedulingService';
export { notificationHistoryService, NotificationHistoryItem, NotificationFilter } from './NotificationHistoryService';
export { NotificationService, notificationService } from './NotificationService';

// Export types for convenience
export type {
  NotificationPayload,
  LocalNotification,
  ScheduledNotification,
  DeliveryResult,
  NotificationPreferences,
  ValidationResult,
  Notification,
  SmartSchedulingOptions,
  OptimalTime
} from './interfaces';
