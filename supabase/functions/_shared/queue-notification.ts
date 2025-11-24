/**
 * Helper function to queue notifications with deduplication
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { generateDeduplicationKey } from './notification-helpers.ts';

export interface QueueNotificationParams {
  userId: string;
  notificationType: string;
  title: string;
  body: string;
  data?: object;
  itemId?: string;
  priority?: number;
  scheduledFor?: Date;
  maxRetries?: number;
}

/**
 * Queue a notification with deduplication check
 * @param supabaseAdmin Supabase admin client
 * @param params Notification parameters
 * @returns Queue result with notification ID or null if duplicate
 */
export async function queueNotificationWithDeduplication(
  supabaseAdmin: SupabaseClient,
  params: QueueNotificationParams,
): Promise<{
  success: boolean;
  notificationId: string | null;
  isDuplicate: boolean;
}> {
  const {
    userId,
    notificationType,
    title,
    body,
    data,
    itemId,
    priority = 5,
    scheduledFor = new Date(),
    maxRetries = 3,
  } = params;

  // Generate deduplication key
  const dedupKey = generateDeduplicationKey(userId, notificationType, itemId);

  // Check if notification already exists in queue
  const { data: existing } = await supabaseAdmin
    .from('notification_queue')
    .select('id')
    .eq('deduplication_key', dedupKey)
    .in('status', ['pending', 'processing', 'sent'])
    .single();

  if (existing) {
    return {
      success: true,
      notificationId: existing.id,
      isDuplicate: true,
    };
  }

  // Also check notification_deliveries for recent sends (within last hour)
  // This provides additional deduplication protection
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentDelivery } = await supabaseAdmin
    .from('notification_deliveries')
    .select('id')
    .eq('user_id', userId)
    .eq('notification_type', notificationType)
    .gte('sent_at', oneHourAgo)
    .limit(1)
    .single();

  // Check if metadata matches (same itemId if present)
  if (recentDelivery && itemId) {
    const { data: deliveryDetails } = await supabaseAdmin
      .from('notification_deliveries')
      .select('metadata')
      .eq('id', recentDelivery.id)
      .single();

    // If same itemId, treat as duplicate
    if (deliveryDetails?.metadata?.itemId === itemId) {
      return {
        success: true,
        notificationId: null,
        isDuplicate: true,
      };
    }
  }

  // Insert new notification
  const { data: notification, error } = await supabaseAdmin
    .from('notification_queue')
    .insert({
      user_id: userId,
      notification_type: notificationType,
      title,
      body,
      data: data || {},
      priority,
      scheduled_for: scheduledFor.toISOString(),
      deduplication_key: dedupKey,
      status: 'pending',
      max_retries: maxRetries,
    })
    .select('id')
    .single();

  if (error) {
    // If it's a duplicate key error, it means another process inserted it
    if (error.code === '23505') {
      return {
        success: true,
        notificationId: null,
        isDuplicate: true,
      };
    }
    throw error;
  }

  return {
    success: true,
    notificationId: notification.id,
    isDuplicate: false,
  };
}
