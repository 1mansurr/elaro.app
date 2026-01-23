/**
 * Fallback Handler for Quota Exhaustion
 *
 * Provides graceful degradation when service quotas are exceeded
 */

// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { logger } from './logging.ts';
import { getQuotaStatus } from './quota-monitor.ts';

/**
 * Queue a notification for later delivery when quota is exhausted
 */
export async function queueNotificationForLater(
  supabaseClient: SupabaseClient,
  userId: string,
  pushToken: string,
  title: string,
  body: string,
  data?: object,
  priority: string = 'normal',
): Promise<void> {
  try {
    const { error } = await supabaseClient.from('notification_queue').insert({
      user_id: userId,
      push_token: pushToken,
      title,
      body,
      data,
      priority,
      status: 'pending',
      scheduled_for: new Date().toISOString(),
    });

    if (error) {
      await logger.error(
        'Error queueing notification',
        {
          error: error.message,
          userId,
          title: title.substring(0, 50),
        },
        { traceId: 'fallback-handler' },
      );
    } else {
      await logger.info(
        'Notification queued for later delivery',
        {
          userId,
          title: title.substring(0, 50),
        },
        { traceId: 'fallback-handler' },
      );
    }
  } catch (error) {
    await logger.error(
      'Exception queueing notification',
      {
        error: error instanceof Error ? error.message : String(error),
        userId,
      },
      { traceId: 'fallback-handler' },
    );
  }
}

/**
 * Process queued notifications when quota becomes available
 */
export async function processNotificationQueue(
  supabaseClient: SupabaseClient,
  maxProcess: number = 100,
): Promise<{ processed: number; sent: number; failed: number }> {
  let processed = 0;
  let sent = 0;
  let failed = 0;

  try {
    // Get pending notifications ordered by priority and creation time
    const { data: pending, error: fetchError } = await supabaseClient
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false }) // High priority first
      .order('created_at', { ascending: true }) // Oldest first
      .limit(maxProcess);

    // Filter out notifications that have exceeded max retries
    const filtered = (pending || []).filter((n: { retry_count?: number; max_retries?: number }) => (n.retry_count || 0) < (n.max_retries || 0));

    if (fetchError) {
      await logger.error(
        'Error fetching queued notifications',
        { error: fetchError.message },
        { traceId: 'fallback-handler' },
      );
      return { processed: 0, sent: 0, failed: 0 };
    }

    if (!filtered || filtered.length === 0) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    // Check quota status
    const quotaStatus = await getQuotaStatus(supabaseClient, 'expo_push');

    if (quotaStatus.remaining === 0) {
      await logger.info(
        'Quota exhausted, skipping notification queue processing',
        {
          queue_size: filtered.length,
        },
        { traceId: 'fallback-handler' },
      );
      return { processed: 0, sent: 0, failed: 0 };
    }

    // Process notifications up to available quota
    const toProcess = Math.min(filtered.length, quotaStatus.remaining);

    for (let i = 0; i < toProcess; i++) {
      const notification = filtered[i];
      processed++;

      try {
        // Mark as processing
        await supabaseClient
          .from('notification_queue')
          .update({ status: 'processing' })
          .eq('id', notification.id);

        // Import notification sender dynamically to avoid circular dependencies
        const { sendPushNotification } =
          await import('./send-push-notification.ts');

        // Send notification
        const result = await sendPushNotification(
          supabaseClient,
          notification.push_token ? [notification.push_token] : [],
          notification.title,
          notification.body,
          notification.data,
          { priority: (notification.priority === 'urgent' ? 'high' : notification.priority) as 'normal' | 'high' | 'default' | undefined },
        );

        if (result.success && result.sentCount > 0) {
          // Mark as sent
          await supabaseClient
            .from('notification_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', notification.id);

          sent++;

          // Track quota usage for successful send
          const { trackQuotaUsage } = await import('./quota-monitor.ts');
          await trackQuotaUsage(supabaseClient, 'expo_push', result.sentCount);
        } else {
          // Mark as failed and increment retry count
          const newRetryCount = notification.retry_count + 1;
          const shouldRetry = newRetryCount < notification.max_retries;

          await supabaseClient
            .from('notification_queue')
            .update({
              status: shouldRetry ? 'pending' : 'failed',
              retry_count: newRetryCount,
              error_message: `Failed to send: ${result.failureCount} failures`,
              failed_at: shouldRetry ? null : new Date().toISOString(),
              scheduled_for: shouldRetry
                ? new Date(Date.now() + 60000).toISOString()
                : notification.scheduled_for, // Retry in 1 minute
            })
            .eq('id', notification.id);

          failed++;
        }
      } catch (error) {
        // Mark as failed
        const newRetryCount = notification.retry_count + 1;
        const shouldRetry = newRetryCount < notification.max_retries;

        await supabaseClient
          .from('notification_queue')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            retry_count: newRetryCount,
            error_message:
              error instanceof Error ? error.message : String(error),
            failed_at: shouldRetry ? null : new Date().toISOString(),
            scheduled_for: shouldRetry
              ? new Date(Date.now() + 60000).toISOString()
              : notification.scheduled_for,
          })
          .eq('id', notification.id);

        failed++;
        await logger.error(
          'Error processing queued notification',
          {
            error: error instanceof Error ? error.message : String(error),
            notification_id: notification.id,
          },
          { traceId: 'fallback-handler' },
        );
      }
    }

    await logger.info(
      'Processed notification queue',
      {
        processed,
        sent,
        failed,
        remaining: filtered.length - processed,
      },
      { traceId: 'fallback-handler' },
    );

    return { processed, sent, failed };
  } catch (error) {
    await logger.error(
      'Exception processing notification queue',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { traceId: 'fallback-handler' },
    );
    return { processed, sent, failed };
  }
}
