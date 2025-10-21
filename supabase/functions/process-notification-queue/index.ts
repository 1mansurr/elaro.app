import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler, SupabaseClient, AppError } from '../_shared/function-handler.ts';
import { sendPushNotification } from '../_shared/send-push-notification.ts';

async function handleProcessNotificationQueue(supabaseAdmin: SupabaseClient) {
  console.log('--- Starting Notification Queue Processing ---');

  // 1. Get pending notifications (prioritized)
  const { data: pending, error: fetchError } = await supabaseAdmin
    .rpc('get_pending_notifications', { p_limit: 100 });

  if (fetchError) {
    throw new AppError('Failed to fetch pending notifications', 500, 'DB_ERROR', fetchError);
  }

  if (!pending || pending.length === 0) {
    console.log('No pending notifications to process');
    return { success: true, processed: 0, sent: 0, failed: 0 };
  }

  console.log(`Found ${pending.length} pending notifications`);

  let sentCount = 0;
  let failedCount = 0;
  const processedIds: string[] = [];

  // 2. Group notifications by user for potential batching
  const groupedByUser = pending.reduce((acc, notif) => {
    if (!acc[notif.user_id]) {
      acc[notif.user_id] = [];
    }
    acc[notif.user_id].push(notif);
    return acc;
  }, {} as Record<string, typeof pending>);

  // 3. Process each user's notifications
  for (const [userId, notifications] of Object.entries(groupedByUser)) {
    try {
      // Get user's push tokens
      const { data: devices } = await supabaseAdmin
        .from('user_devices')
        .select('push_token')
        .eq('user_id', userId);

      const pushTokens = devices?.map(d => d.push_token).filter(Boolean) || [];

      if (pushTokens.length === 0) {
        console.log(`User ${userId} has no push tokens, marking as failed`);
        // Mark all as failed
        processedIds.push(...notifications.map(n => n.id));
        failedCount += notifications.length;
        continue;
      }

      // 4. Send notifications (Expo SDK handles batching internally)
      for (const notif of notifications) {
        const result = await sendPushNotification(
          supabaseAdmin,
          pushTokens,
          notif.title,
          notif.body,
          notif.data
        );

        // 5. Record delivery
        await supabaseAdmin.from('notification_deliveries').insert({
          user_id: userId,
          notification_type: notif.notification_type,
          title: notif.title,
          body: notif.body,
          sent_at: new Date().toISOString(),
          device_token: pushTokens[0],
          deep_link_url: notif.data?.url,
          metadata: notif.data,
          expo_status: result.success ? 'ok' : 'error',
          error_message: result.success ? null : 'Failed to send',
        });

        if (result.success) {
          sentCount++;
          processedIds.push(notif.id);
        } else {
          failedCount++;
          
          // Schedule retry if under max retries
          const retryCount = notif.retry_count || 0;
          if (retryCount < (notif.max_retries || 3)) {
            // Exponential backoff: 5min, 15min, 1hr
            const backoffMinutes = Math.pow(3, retryCount) * 5;
            const nextRetry = new Date(Date.now() + backoffMinutes * 60000);

            await supabaseAdmin
              .from('notification_queue')
              .update({
                status: 'failed',
                retry_count: retryCount + 1,
                next_retry_at: nextRetry.toISOString(),
                last_error: result.invalidTokens.length > 0 ? 'Invalid token' : 'Send failed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', notif.id);
          } else {
            // Max retries reached, mark as failed permanently
            processedIds.push(notif.id);
            await supabaseAdmin
              .from('notification_queue')
              .update({
                status: 'failed',
                last_error: 'Max retries exceeded',
                updated_at: new Date().toISOString(),
              })
              .eq('id', notif.id);
          }
        }
      }
    } catch (error: any) {
      console.error(`Error processing notifications for user ${userId}:`, error);
      failedCount += notifications.length;
    }
  }

  // 6. Mark successfully sent notifications
  if (processedIds.length > 0) {
    await supabaseAdmin
      .from('notification_queue')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', processedIds);
  }

  // 7. Process retries
  const { data: retries } = await supabaseAdmin
    .from('notification_queue')
    .select('*')
    .eq('status', 'failed')
    .lte('next_retry_at', new Date().toISOString())
    .lt('retry_count', 3);

  if (retries && retries.length > 0) {
    console.log(`Retrying ${retries.length} failed notifications`);
    
    // Reset status to pending for retry
    await supabaseAdmin
      .from('notification_queue')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .in('id', retries.map(r => r.id));
  }

  const result = {
    success: true,
    processed: pending.length,
    sent: sentCount,
    failed: failedCount,
    retried: retries?.length || 0,
  };

  console.log('--- Notification Queue Processing Complete ---', result);
  return result;
}

serve(createScheduledHandler(handleProcessNotificationQueue));

