// Offline MVP stub — all API/Supabase calls removed

export interface QueuedNotification {
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: number;
  scheduled_for?: Date;
  max_retries?: number;
}

export async function queueNotification(
  _notification: QueuedNotification,
): Promise<{ success: boolean; error?: string; isDuplicate?: boolean }> {
  return { success: false, error: 'Not available in offline mode' };
}

export async function queueNotificationBatch(
  _notifications: QueuedNotification[],
): Promise<{
  success: boolean;
  queued: number;
  failed: number;
  duplicates: number;
}> {
  return { success: false, queued: 0, failed: 0, duplicates: 0 };
}

export async function cancelQueuedNotification(
  _notificationId: string,
): Promise<{ success: boolean }> {
  return { success: false };
}

export async function getUserQueuedNotifications(
  _userId: string,
): Promise<QueuedNotification[]> {
  return [];
}

export async function getNotificationAnalytics(_userId: string): Promise<null> {
  return null;
}
