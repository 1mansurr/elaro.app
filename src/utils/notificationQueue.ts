import { supabase } from '@/services/supabase';

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

    // Check if notification already exists in queue
    const { data: existing } = await supabase
      .from('notification_queue')
      .select('id')
      .eq('deduplication_key', dedupKey)
      .in('status', ['pending', 'processing', 'sent'])
      .single();

    if (existing) {
      console.log('Notification already queued (deduplication)', { dedupKey });
      return { success: true, isDuplicate: true };
    }

    // Also check notification_deliveries for recent sends (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentDelivery } = await supabase
      .from('notification_deliveries')
      .select('id')
      .eq('user_id', notification.user_id)
      .eq('notification_type', notification.notification_type)
      .gte('sent_at', oneHourAgo)
      .limit(1)
      .single();

    // Check if metadata matches (same itemId if present)
    if (recentDelivery && itemId) {
      const { data: deliveryDetails } = await supabase
        .from('notification_deliveries')
        .select('metadata')
        .eq('id', recentDelivery.id)
        .single();

      // If same itemId, treat as duplicate
      if (deliveryDetails?.metadata?.itemId === itemId) {
        console.log('Notification sent recently (deduplication)', { dedupKey });
        return { success: true, isDuplicate: true };
      }
    }

    // Insert new notification with deduplication key
    const { error } = await supabase.from('notification_queue').insert({
      user_id: notification.user_id,
      notification_type: notification.notification_type,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      priority: notification.priority || 5,
      scheduled_for: (notification.scheduled_for || new Date()).toISOString(),
      max_retries: notification.max_retries || 3,
      status: 'pending',
      deduplication_key: dedupKey,
    });

    if (error) {
      // If it's a duplicate key error, it means another process inserted it
      if (error.code === '23505') {
        console.log('Notification already queued (unique constraint)', {
          dedupKey,
        });
        return { success: true, isDuplicate: true };
      }
      console.error('Error queueing notification:', error);
      return { success: false, error: error.message };
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

    // Check for existing notifications in database
    const { data: existingNotifications } = await supabase
      .from('notification_queue')
      .select('deduplication_key')
      .in('deduplication_key', Array.from(dedupKeys))
      .in('status', ['pending', 'processing', 'sent']);

    const existingKeys = new Set(
      existingNotifications?.map(n => n.deduplication_key) || [],
    );

    // Filter out notifications that already exist
    const uniqueNotifications = notificationsToInsert.filter(
      notif => !existingKeys.has(notif.deduplication_key),
    );

    duplicates += notificationsToInsert.length - uniqueNotifications.length;

    if (uniqueNotifications.length === 0) {
      return { success: true, queued: 0, failed: 0, duplicates };
    }

    const { data, error } = await supabase
      .from('notification_queue')
      .insert(uniqueNotifications)
      .select();

    if (error) {
      console.error('Error queueing notifications:', error);
      return {
        success: false,
        queued: 0,
        failed: uniqueNotifications.length,
        duplicates,
      };
    }

    const queuedCount = data?.length || 0;
    const failedCount = uniqueNotifications.length - queuedCount;

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
    const { error } = await supabase
      .from('notification_queue')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;

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
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('scheduled_for', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting queued notifications:', error);
    return [];
  }
}

/**
 * Get notification delivery analytics
 */
export async function getNotificationAnalytics(userId: string): Promise<{
  total_sent: number;
  total_opened: number;
  open_rate: number;
  by_type: Record<string, any>;
} | null> {
  try {
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
      (
        acc: Record<string, { sent: number; opened: number }>,
        item: AnalyticsItem,
      ) => {
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
