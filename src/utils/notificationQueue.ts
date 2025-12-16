import { versionedApiClient } from '@/services/VersionedApiClient';

export interface QueuedNotification {
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: number; // 1=highest, 10=lowest
  scheduled_for?: Date;
  max_retries?: number;
}

/**
 * Generate deduplication key for notification (frontend version)
 * Format: userId:notificationType:itemId:timeBucket
 * @param userId User ID
 * @param notificationType Type of notification
 * @param itemId Optional item ID (assignment, lecture, etc.)
 * @param timeBucketMinutes Time bucket size in minutes (default: 1440 = daily)
 * @returns Deduplication key
 */
function generateDeduplicationKey(
  userId: string,
  notificationType: string,
  itemId?: string,
  timeBucketMinutes: number = 1440,
): string {
  const now = new Date();

  // Calculate total minutes since epoch (not just minutes in hour)
  const totalMinutes = Math.floor(now.getTime() / (1000 * 60));

  // Round down to nearest bucket
  const bucketMinutes =
    Math.floor(totalMinutes / timeBucketMinutes) * timeBucketMinutes;

  // Convert back to date and format as YYYYMMDDHHMM
  const bucketDate = new Date(bucketMinutes * 60 * 1000);
  const bucketStr = bucketDate.toISOString().slice(0, 16).replace(/[-:T]/g, '');

  if (itemId) {
    return `${userId}:${notificationType}:${itemId}:${bucketStr}`;
  }
  return `${userId}:${notificationType}::${bucketStr}`;
}

/**
 * Queue a notification for delivery with deduplication
 * @param notification - Notification to queue
 * @returns Success status
 */
export async function queueNotification(
  notification: QueuedNotification,
): Promise<{ success: boolean; error?: string; isDuplicate?: boolean }> {
  try {
    // Generate deduplication key
    const itemId =
      notification.data?.itemId ||
      notification.data?.assignment_id ||
      notification.data?.lecture_id;
    const dedupKey = generateDeduplicationKey(
      notification.user_id,
      notification.notification_type,
      itemId,
      1440, // Daily bucket
    );

    // Use notification-system API to add to queue
    const response = await versionedApiClient.addToNotificationQueue({
      notification_type: notification.notification_type,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      priority: notification.priority || 5,
      scheduled_for: (notification.scheduled_for || new Date()).toISOString(),
      max_retries: notification.max_retries || 3,
      deduplication_key: dedupKey,
    });

    if (response.error) {
      // If it's a duplicate, the API should handle it
      if (response.message?.includes('duplicate') || response.message?.includes('already')) {
        console.log('Notification already queued (deduplication)', { dedupKey });
        return { success: true, isDuplicate: true };
      }
      console.error('Error queueing notification:', response.error);
      return { success: false, error: response.message || response.error || 'Failed to queue notification' };
    }

    console.log('Notification queued successfully');
    return { success: true, isDuplicate: false };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error in queueNotification:', error);
    return {
      success: false,
      error: err?.message || 'Failed to queue notification',
    };
  }
}

/**
 * Queue multiple notifications in batch with deduplication
 */
export async function queueNotificationBatch(
  notifications: QueuedNotification[],
): Promise<{
  success: boolean;
  queued: number;
  failed: number;
  duplicates: number;
}> {
  try {
    // Generate deduplication keys and filter duplicates
    const notificationsToInsert: Array<
      Omit<QueuedNotification, 'user_id'> & { user_id: string }
    > = [];
    const dedupKeys = new Set<string>();
    let duplicates = 0;

    for (const notif of notifications) {
      const itemId =
        notif.data?.itemId ||
        notif.data?.assignment_id ||
        notif.data?.lecture_id;
      const dedupKey = generateDeduplicationKey(
        notif.user_id,
        notif.notification_type,
        itemId,
        1440, // Daily bucket
      );

      // Skip if we've already seen this dedup key in this batch
      if (dedupKeys.has(dedupKey)) {
        duplicates++;
        continue;
      }

      dedupKeys.add(dedupKey);
      notificationsToInsert.push({
        user_id: notif.user_id,
        notification_type: notif.notification_type,
        title: notif.title,
        body: notif.body,
        data: notif.data || {},
        priority: notif.priority || 5,
        scheduled_for: (notif.scheduled_for || new Date()).toISOString(),
        max_retries: notif.max_retries || 3,
        status: 'pending',
        deduplication_key: dedupKey,
      });
    }

    if (notificationsToInsert.length === 0) {
      return { success: true, queued: 0, failed: 0, duplicates };
    }

    // Queue notifications one by one using API (batch support can be added later)
    let queuedCount = 0;
    let failedCount = 0;

    for (const notif of notificationsToInsert) {
      const response = await versionedApiClient.addToNotificationQueue({
        notification_type: notif.notification_type,
        title: notif.title,
        body: notif.body,
        data: notif.data || {},
        priority: notif.priority || 5,
        scheduled_for: notif.scheduled_for || new Date().toISOString(),
        max_retries: notif.max_retries || 3,
        deduplication_key: notif.deduplication_key,
      });

      if (response.error) {
        // If duplicate, count as duplicate not failed
        if (response.message?.includes('duplicate') || response.message?.includes('already')) {
          duplicates++;
        } else {
          failedCount++;
        }
      } else {
        queuedCount++;
      }
    }

    return {
      success: true,
      queued: queuedCount,
      failed: failedCount > 0 ? failedCount : 0,
      duplicates,
    };
  } catch (error) {
    console.error('Error in queueNotificationBatch:', error);
    return {
      success: false,
      queued: 0,
      failed: notifications.length,
      duplicates: 0,
    };
  }
}

/**
 * Cancel a queued notification
 */
export async function cancelQueuedNotification(
  notificationId: string,
): Promise<{ success: boolean }> {
  try {
    const response = await versionedApiClient.removeFromNotificationQueue(notificationId);

    if (response.error) {
      throw new Error(response.message || response.error || 'Failed to cancel notification');
    }

    return { success: true };
  } catch (error) {
    console.error('Error cancelling queued notification:', error);
    return { success: false };
  }
}

/**
 * Get queued notifications for a user
 */
export async function getUserQueuedNotifications(
  userId: string,
): Promise<QueuedNotification[]> {
  try {
    const response = await versionedApiClient.getNotificationQueue();

    if (response.error) {
      throw new Error(response.message || response.error || 'Failed to get queued notifications');
    }

    return (response.data || []) as QueuedNotification[];
  } catch (error) {
    console.error('Error getting queued notifications:', error);
    return [];
  }
}

/**
 * Get notification delivery analytics
 */
interface NotificationTypeStats {
  sent: number;
  opened: number;
  open_rate?: number;
  best_hour?: number;
}

export async function getNotificationAnalytics(userId: string): Promise<{
  total_sent: number;
  total_opened: number;
  open_rate: number;
  by_type: Record<string, NotificationTypeStats>;
} | null> {
  try {
    // Note: This RPC call is not yet migrated to API layer
    // For now, we'll keep using direct Supabase for analytics
    // This can be migrated when an analytics endpoint is added
    const { supabase } = await import('@/services/supabase');
    const { data, error } = await supabase.rpc('get_notification_engagement', {
      p_user_id: userId,
    });

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        total_sent: 0,
        total_opened: 0,
        open_rate: 0,
        by_type: {},
      };
    }

    // Aggregate data
    interface AnalyticsItem {
      total_sent: number;
      total_opened: number;
      notification_type: string;
      open_rate?: number;
      best_hour?: number;
    }
    const totalSent = data.reduce(
      (sum: number, item: AnalyticsItem) => sum + item.total_sent,
      0,
    );
    const totalOpened = data.reduce(
      (sum: number, item: AnalyticsItem) => sum + item.total_opened,
      0,
    );
    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;

    const byType = data.reduce(
      (acc: Record<string, NotificationTypeStats>, item: AnalyticsItem) => {
        acc[item.notification_type] = {
          sent: item.total_sent,
          opened: item.total_opened,
          open_rate: item.open_rate,
          best_hour: item.best_hour,
        };
        return acc;
      },
      {},
    );

    return {
      total_sent: totalSent,
      total_opened: totalOpened,
      open_rate: parseFloat(openRate.toFixed(2)),
      by_type: byType,
    };
  } catch (error) {
    console.error('Error getting notification analytics:', error);
    return null;
  }
}
