import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppError } from '@/utils/AppError';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface NotificationHistoryItem {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  sent_at: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  dismissed_at?: string;
  deep_link_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface NotificationFilter {
  type:
    | 'all'
    | 'assignments'
    | 'lectures'
    | 'study_sessions'
    | 'analytics'
    | 'summaries';
  label: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
}

export interface NotificationHistoryOptions {
  limit?: number;
  offset?: number;
  filter?: NotificationFilter;
  includeRead?: boolean;
}

export interface OfflineAction {
  id: string;
  action: 'mark_read' | 'delete' | 'complete_task';
  notificationId: string;
  timestamp: string;
  synced: boolean;
}

// ============================================================================
// NOTIFICATION HISTORY SERVICE
// ============================================================================

export class NotificationHistoryService {
  private static instance: NotificationHistoryService;
  private static readonly CACHE_KEY = 'notification_history_cache';
  private static readonly OFFLINE_ACTIONS_KEY = 'notification_offline_actions';
  private static readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): NotificationHistoryService {
    if (!NotificationHistoryService.instance) {
      NotificationHistoryService.instance = new NotificationHistoryService();
    }
    return NotificationHistoryService.instance;
  }

  // ============================================================================
  // FILTER CONFIGURATION
  // ============================================================================

  public getNotificationFilters(): NotificationFilter[] {
    return [
      { type: 'all', label: 'All', icon: 'list-outline' },
      { type: 'assignments', label: 'Assignments', icon: 'document-outline' },
      { type: 'lectures', label: 'Lectures', icon: 'person-outline' },
      { type: 'study_sessions', label: 'Study Sessions', icon: 'book-outline' },
      // TEMPORARY: Analytics and Summaries filters removed
      // { type: 'analytics', label: 'Analytics', icon: 'trending-up-outline' },
      // { type: 'summaries', label: 'Summaries', icon: 'bar-chart-outline' },
    ];
  }

  // ============================================================================
  // NOTIFICATION HISTORY METHODS
  // ============================================================================

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(
    _userId: string,
    _options: NotificationHistoryOptions = {},
  ): Promise<NotificationHistoryItem[]> {
    return [];
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(_userId: string): Promise<number> {
    return 0;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(_notificationId: string, _userId: string): Promise<void> {
    // Offline mode — no-op
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(_userId: string): Promise<void> {
    // Offline mode — no-op
  }

  /**
   * Delete notification
   */
  async deleteNotification(
    _notificationId: string,
    _userId: string,
  ): Promise<void> {
    // Offline mode — no-op
  }

  /**
   * Complete task from notification
   */
  async completeTaskFromNotification(
    _notificationId: string,
    _userId: string,
  ): Promise<void> {
    // Offline mode — no-op
  }

  // ============================================================================
  // FILTERING METHODS
  // ============================================================================

  private filterNotifications(
    notifications: NotificationHistoryItem[],
    filter?: NotificationFilter,
  ): NotificationHistoryItem[] {
    if (!filter || filter.type === 'all') {
      return notifications;
    }

    return notifications.filter(notification => {
      const type = notification.notification_type;

      switch (filter.type) {
        case 'assignments':
          return type === 'assignment' || type === 'assignment_reminder';
        case 'lectures':
          return type === 'lecture' || type === 'lecture_reminder';
        case 'study_sessions':
          return (
            type === 'srs' ||
            type === 'study_session' ||
            type === 'srs_reminder'
          );
        case 'analytics':
          return type === 'weekly_report' || type === 'analytics';
        case 'summaries':
          return (
            type === 'daily_summary' ||
            type === 'achievement' ||
            type === 'update'
          );
        default:
          return true;
      }
    });
  }

  // ============================================================================
  // CACHING METHODS
  // ============================================================================

  private async cacheHistory(
    userId: string,
    notifications: NotificationHistoryItem[],
  ): Promise<void> {
    try {
      const cacheData = {
        notifications,
        timestamp: Date.now(),
        userId,
      };

      await AsyncStorage.setItem(
        `${NotificationHistoryService.CACHE_KEY}_${userId}`,
        JSON.stringify(cacheData),
      );
    } catch (error) {
      console.error('Error caching notification history:', error);
    }
  }

  private async getCachedHistory(userId: string): Promise<{
    notifications: NotificationHistoryItem[];
    timestamp: number;
  } | null> {
    try {
      const cachedData = await AsyncStorage.getItem(
        `${NotificationHistoryService.CACHE_KEY}_${userId}`,
      );
      if (cachedData) {
        // Guard: Only parse if cachedData is valid
        if (
          cachedData.trim() &&
          cachedData !== 'undefined' &&
          cachedData !== 'null'
        ) {
          try {
            return JSON.parse(cachedData);
          } catch {
            return null;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached notification history:', error);
      return null;
    }
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < NotificationHistoryService.CACHE_EXPIRY;
  }

  private async clearCache(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(
        `${NotificationHistoryService.CACHE_KEY}_${userId}`,
      );
    } catch (error) {
      console.error('Error clearing notification cache:', error);
    }
  }

  // ============================================================================
  // OFFLINE SUPPORT METHODS
  // ============================================================================

  private async storeOfflineAction(action: OfflineAction): Promise<void> {
    try {
      const existingActions = await this.getOfflineActions();
      const updatedActions = [...existingActions, action];

      await AsyncStorage.setItem(
        NotificationHistoryService.OFFLINE_ACTIONS_KEY,
        JSON.stringify(updatedActions),
      );
    } catch (error) {
      console.error('Error storing offline action:', error);
    }
  }

  private async getOfflineActions(): Promise<OfflineAction[]> {
    try {
      const actions = await AsyncStorage.getItem(
        NotificationHistoryService.OFFLINE_ACTIONS_KEY,
      );
      if (actions) {
        // Guard: Only parse if actions is valid
        if (actions.trim() && actions !== 'undefined' && actions !== 'null') {
          try {
            return JSON.parse(actions);
          } catch {
            return [];
          }
        }
      }
      return [];
    } catch (error) {
      console.error('Error getting offline actions:', error);
      return [];
    }
  }

  /**
   * Sync offline actions when back online
   */
  async syncOfflineActions(userId: string): Promise<void> {
    try {
      const offlineActions = await this.getOfflineActions();
      const userActions = offlineActions.filter(action => !action.synced);

      for (const action of userActions) {
        try {
          switch (action.action) {
            case 'mark_read':
              await this.markAsRead(action.notificationId, userId);
              break;
            case 'delete':
              await this.deleteNotification(action.notificationId, userId);
              break;
            case 'complete_task':
              await this.completeTaskFromNotification(
                action.notificationId,
                userId,
              );
              break;
          }

          // Mark as synced
          action.synced = true;
        } catch (error) {
          console.error(`Error syncing offline action ${action.id}:`, error);
        }
      }

      // Update stored actions
      await AsyncStorage.setItem(
        NotificationHistoryService.OFFLINE_ACTIONS_KEY,
        JSON.stringify(offlineActions),
      );
    } catch (error) {
      console.error('Error syncing offline actions:', error);
    }
  }

  /**
   * Clean up old notifications (20 days)
   */
  async cleanupOldNotifications(_userId: string): Promise<void> {
    // Offline mode — no-op
  }
}

// Export singleton instance
export const notificationHistoryService =
  NotificationHistoryService.getInstance();
