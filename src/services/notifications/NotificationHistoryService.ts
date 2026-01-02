import { versionedApiClient } from '@/services/VersionedApiClient';
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
    userId: string,
    options: NotificationHistoryOptions = {},
  ): Promise<NotificationHistoryItem[]> {
    try {
      const { limit = 50, offset = 0, filter, includeRead = true } = options;

      // Check cache first
      const cachedData = await this.getCachedHistory(userId);
      if (cachedData && this.isCacheValid(cachedData.timestamp)) {
        return this.filterNotifications(cachedData.notifications, filter);
      }

      // Use API layer
      const response = await versionedApiClient.getNotificationHistory({
        limit,
        offset,
        filter: filter?.type || 'all',
        includeRead,
      });

      if (response.error) {
        // Try to return cached data if available
        const cachedData = await this.getCachedHistory(userId);
        if (cachedData) {
          return this.filterNotifications(
            cachedData.notifications,
            options.filter,
          );
        }

        throw new AppError(
          response.message ||
            response.error ||
            'Failed to get notification history',
          500,
          'NOTIFICATION_HISTORY_ERROR',
          { userId, options },
        );
      }

      const notifications = (response.data || []) as NotificationHistoryItem[];

      // Cache the results
      await this.cacheHistory(userId, notifications);

      // Apply filters (API already filters by type, but we keep this for client-side filtering)
      return this.filterNotifications(notifications, filter);
    } catch (error) {
      // Try to return cached data if available
      const cachedData = await this.getCachedHistory(userId);
      if (cachedData) {
        return this.filterNotifications(
          cachedData.notifications,
          options.filter,
        );
      }

      throw new AppError(
        `Error getting notification history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'NOTIFICATION_HISTORY_ERROR',
        { userId, options },
      );
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const response = await versionedApiClient.getUnreadNotificationCount();

      if (response.error) {
        throw new AppError(
          response.message || response.error || 'Failed to get unread count',
          500,
          'UNREAD_COUNT_ERROR',
          { userId },
        );
      }

      return response.data?.count || 0;
    } catch (error) {
      throw new AppError(
        `Error getting unread count: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'UNREAD_COUNT_ERROR',
        { userId },
      );
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const response =
        await versionedApiClient.markNotificationAsRead(notificationId);

      if (response.error) {
        throw new AppError(
          response.message ||
            response.error ||
            'Failed to mark notification as read',
          500,
          'MARK_READ_ERROR',
          { notificationId, userId },
        );
      }

      // Clear cache to force refresh
      await this.clearCache(userId);
    } catch (error) {
      // Store offline action if network fails
      await this.storeOfflineAction({
        id: `mark_read_${Date.now()}`,
        action: 'mark_read',
        notificationId,
        timestamp: new Date().toISOString(),
        synced: false,
      });

      throw new AppError(
        `Error marking notification as read: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'MARK_READ_ERROR',
        { notificationId, userId },
      );
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_deliveries')
        .update({ opened_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('opened_at', null);

      if (error) {
        throw new AppError(
          `Failed to mark all notifications as read: ${error.message}`,
          500,
          'MARK_ALL_READ_ERROR',
          { userId },
        );
      }

      // Clear cache to force refresh
      await this.clearCache(userId);
    } catch (error) {
      throw new AppError(
        `Error marking all notifications as read: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'MARK_ALL_READ_ERROR',
        { userId },
      );
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_deliveries')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        throw new AppError(
          `Failed to delete notification: ${error.message}`,
          500,
          'DELETE_NOTIFICATION_ERROR',
          { notificationId, userId },
        );
      }

      // Clear cache to force refresh
      await this.clearCache(userId);
    } catch (error) {
      // Store offline action if network fails
      await this.storeOfflineAction({
        id: `delete_${Date.now()}`,
        action: 'delete',
        notificationId,
        timestamp: new Date().toISOString(),
        synced: false,
      });

      throw new AppError(
        `Error deleting notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'DELETE_NOTIFICATION_ERROR',
        { notificationId, userId },
      );
    }
  }

  /**
   * Complete task from notification
   */
  async completeTaskFromNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    try {
      // Get notification metadata to find task ID
      const { data: notification, error: fetchError } = await supabase
        .from('notification_deliveries')
        .select('metadata')
        .eq('id', notificationId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !notification?.metadata?.taskId) {
        throw new AppError(
          'Task ID not found in notification metadata',
          500,
          'TASK_NOT_FOUND',
          { notificationId, userId },
        );
      }

      // Mark task as complete (this would integrate with your existing task service)
      // For now, we'll just mark the notification as read
      await this.markAsRead(notificationId, userId);
    } catch (error) {
      // Store offline action if network fails
      await this.storeOfflineAction({
        id: `complete_task_${Date.now()}`,
        action: 'complete_task',
        notificationId,
        timestamp: new Date().toISOString(),
        synced: false,
      });

      throw new AppError(
        `Error completing task from notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'COMPLETE_TASK_ERROR',
        { notificationId, userId },
      );
    }
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
        if (
          actions.trim() &&
          actions !== 'undefined' &&
          actions !== 'null'
        ) {
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
  async cleanupOldNotifications(userId: string): Promise<void> {
    try {
      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      const { error } = await supabase
        .from('notification_deliveries')
        .delete()
        .eq('user_id', userId)
        .lt('sent_at', twentyDaysAgo.toISOString());

      if (error) {
        console.error('Error cleaning up old notifications:', error);
      }
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }
}

// Export singleton instance
export const notificationHistoryService =
  NotificationHistoryService.getInstance();
