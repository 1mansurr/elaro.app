import { supabase } from '@/services/supabase';

export interface QueuedNotification {
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  data?: any;
  priority?: number; // 1=highest, 10=lowest
  scheduled_for?: Date;
  max_retries?: number;
}

/**
 * Queue a notification for delivery
 * @param notification - Notification to queue
 * @returns Success status
 */
export async function queueNotification(
  notification: QueuedNotification
): Promise<{ success: boolean; error?: string }> {
  try {
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
    });

    if (error) {
      console.error('Error queueing notification:', error);
      return { success: false, error: error.message };
    }

    console.log('Notification queued successfully');
    return { success: true };
  } catch (error: any) {
    console.error('Error in queueNotification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Queue multiple notifications in batch
 */
export async function queueNotificationBatch(
  notifications: QueuedNotification[]
): Promise<{ success: boolean; queued: number; failed: number }> {
  try {
    const notificationsToInsert = notifications.map(notif => ({
      user_id: notif.user_id,
      notification_type: notif.notification_type,
      title: notif.title,
      body: notif.body,
      data: notif.data || {},
      priority: notif.priority || 5,
      scheduled_for: (notif.scheduled_for || new Date()).toISOString(),
      max_retries: notif.max_retries || 3,
      status: 'pending',
    }));

    const { data, error } = await supabase
      .from('notification_queue')
      .insert(notificationsToInsert)
      .select();

    if (error) {
      console.error('Error queueing notifications:', error);
      return { success: false, queued: 0, failed: notifications.length };
    }

    return {
      success: true,
      queued: data?.length || 0,
      failed: notifications.length - (data?.length || 0),
    };
  } catch (error) {
    console.error('Error in queueNotificationBatch:', error);
    return { success: false, queued: 0, failed: notifications.length };
  }
}

/**
 * Cancel a queued notification
 */
export async function cancelQueuedNotification(
  notificationId: string
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
  userId: string
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
export async function getNotificationAnalytics(
  userId: string
): Promise<{
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
    const totalSent = data.reduce((sum: number, item: any) => sum + item.total_sent, 0);
    const totalOpened = data.reduce((sum: number, item: any) => sum + item.total_opened, 0);
    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;

    const byType = data.reduce((acc: Record<string, any>, item: any) => {
      acc[item.notification_type] = {
        sent: item.total_sent,
        opened: item.total_opened,
        open_rate: item.open_rate,
        best_hour: item.best_hour,
      };
      return acc;
    }, {});

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

