import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { sendUnifiedNotification } from '../_shared/unified-notification-sender.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import {
  getUserNotificationPreferences,
  canSendNotification,
} from '../_shared/notification-helpers.ts';

async function handleEveningCapture(supabaseAdmin: SupabaseClient) {
  const traceContext = extractTraceContext(
    new Request('https://cron.internal'),
  );

  await logger.info(
    'Starting evening capture notifications job',
    {},
    traceContext,
  );

  // Get all users who have evening capture enabled from the new preferences table
  const { data: users, error } = await supabaseAdmin
    .from('notification_preferences')
    .select(
      `
      user_id,
      user:users (
        id,
        timezone,
        user_devices (
          push_token
        )
      )
    `,
    )
    .eq('evening_capture_enabled', true);

  if (error) throw handleDbError(error);

  if (!users || users.length === 0) {
    await logger.info(
      'No users with evening capture enabled',
      {},
      traceContext,
    );
    return { success: true, processedUsers: 0 };
  }

  let notifiedCount = 0;
  for (const pref of users) {
    const user = pref.user; // The user object is now nested
    if (!user) continue;

    // Check preferences before sending
    const userPrefs = await getUserNotificationPreferences(
      supabaseAdmin,
      user.id,
    );
    if (!userPrefs || !canSendNotification(userPrefs, 'evening_capture')) {
      continue; // Skip if disabled
    }

    const userDevices = user.user_devices || [];
    if (userDevices.length === 0) continue;

    const localHour = parseInt(
      new Date().toLocaleTimeString('en-US', {
        timeZone: user.timezone || 'UTC',
        hour: '2-digit',
        hour12: false,
      }),
    );
    if (localHour === 19) {
      // 7 PM
      try {
        // Send via unified sender (respects preferences and supports email)
        // Pass preferences to avoid refetch in unified sender
        const result = await sendUnifiedNotification(supabaseAdmin, {
          userId: user.id,
          notificationType: 'evening_capture',
          title: "Don't Forget!",
          body: 'Did you get any new assignments today? Add them to Elaro now.',
          emailSubject: 'Evening Reminder',
          emailContent:
            "<h2>Don't Forget!</h2><p>Did you get any new assignments today? Add them to Elaro now.</p>",
          data: { type: 'evening_capture' },
          options: {
            priority: 'normal',
          },
          preferences: userPrefs, // Pass to avoid refetch
        });

        if (result.pushSent || result.emailSent) {
          notifiedCount++;
        }
      } catch (error: unknown) {
        await logger.error(
          'Error sending evening capture notification',
          {
            user_id: user.id,
            error: error instanceof Error ? error.message : String(error),
          },
          traceContext,
        );
      }
    }
  }

  const result = {
    processedUsers: users.length,
    notificationsSent: notifiedCount,
  };
  await logger.info('Finished evening capture job', result, traceContext);
  return result;
}

serve(createScheduledHandler(handleEveningCapture)); // No secret needed, it's time-based and idempotent.
