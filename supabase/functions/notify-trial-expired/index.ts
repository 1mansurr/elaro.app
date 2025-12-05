import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createScheduledHandler,
  SupabaseClient,
} from '../_shared/function-handler.ts';
import { sendUnifiedNotification } from '../_shared/unified-notification-sender.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import {
  getUserNotificationPreferences,
  generateDeduplicationKey,
} from '../_shared/notification-helpers.ts';

/**
 * Notify users whose Oddity trial has expired
 * Runs daily to check for trials that expired today
 */
async function handleNotifyTrialExpired(supabaseAdmin: SupabaseClient) {
  const traceContext = extractTraceContext(
    new Request('https://cron.internal'),
  );

  await logger.info(
    'Starting trial expiration notification job',
    {},
    traceContext,
  );

  try {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Find users whose trial expired today (between today 00:00 and tomorrow 00:00)
    // Only check users who are still marked as 'trialing' (haven't been updated yet)
    const { data: expiredTrials, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, subscription_expires_at, trial_start_date')
      .eq('subscription_status', 'trialing')
      .gte('subscription_expires_at', todayStart.toISOString())
      .lt('subscription_expires_at', todayEnd.toISOString());

    if (fetchError) {
      await logger.error(
        'Error fetching expired trials',
        { error: fetchError.message },
        traceContext,
      );
      throw fetchError;
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      await logger.info('No expired trials found for today', {}, traceContext);
      return {
        success: true,
        message: 'No expired trials found for today',
        notified_count: 0,
      };
    }

    await logger.info(
      `Found ${expiredTrials.length} expired trials`,
      { count: expiredTrials.length },
      traceContext,
    );

    let notifiedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of expiredTrials) {
      try {
        // Generate deduplication key to prevent duplicate notifications
        // Use daily bucket (1440 minutes) to allow one notification per day
        const dedupKey = generateDeduplicationKey(
          user.id,
          'trial_expired',
          user.id,
          1440, // Daily bucket
        );

        // Check if notification was already sent today
        const { data: existingNotification } = await supabaseAdmin
          .from('notification_queue')
          .select('id')
          .eq('deduplication_key', dedupKey)
          .in('status', ['pending', 'processing', 'sent'])
          .single();

        if (existingNotification) {
          await logger.info(
            'Trial expiration notification already sent today (deduplication)',
            {
              user_id: user.id,
              dedup_key: dedupKey,
            },
            traceContext,
          );
          skippedCount++;
          continue;
        }

        // Also check notification_deliveries for recent sends (within last 24 hours)
        const oneDayAgo = new Date(
          Date.now() - 24 * 60 * 60 * 1000,
        ).toISOString();
        const { data: recentDelivery } = await supabaseAdmin
          .from('notification_deliveries')
          .select('id')
          .eq('user_id', user.id)
          .eq('notification_type', 'trial_expired')
          .gte('sent_at', oneDayAgo)
          .single();

        if (recentDelivery) {
          await logger.info(
            'Trial expiration notification already sent in last 24 hours',
            {
              user_id: user.id,
            },
            traceContext,
          );
          skippedCount++;
          continue;
        }

        // Get user preferences
        const prefs = await getUserNotificationPreferences(
          supabaseAdmin,
          user.id,
        );

        // Check if notifications are enabled
        if (prefs?.master_toggle === false || prefs?.do_not_disturb === true) {
          await logger.info(
            'Trial expiration notification skipped - user disabled notifications',
            {
              user_id: user.id,
            },
            traceContext,
          );
          skippedCount++;
          continue;
        }

        // Create notification record first
        const { data: notification, error: notificationError } =
          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: user.id,
              title: 'Your Oddity trial has ended',
              body: 'Upgrade to continue enjoying premium features and unlock your full academic potential.',
              type: 'trial_expired',
              data: {
                action: 'upgrade',
                deep_link: 'elaro://paywall?variant=trial_expired',
              },
              sent_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (notificationError) {
          await logger.error(
            'Error creating notification record',
            {
              user_id: user.id,
              error: notificationError.message,
            },
            traceContext,
          );
          errorCount++;
          continue;
        }

        // Send unified notification (push + email)
        const result = await sendUnifiedNotification(supabaseAdmin, {
          userId: user.id,
          notificationType: 'trial_expired',
          title: 'Your Oddity trial has ended',
          body: 'Upgrade to continue enjoying premium features and unlock your full academic potential.',
          emailSubject: 'Your Oddity trial has ended',
          emailContent: `
            <h2>Your Oddity trial has ended</h2>
            <p>Thank you for trying ELARO! Your 7-day Oddity trial has come to an end.</p>
            <p>Upgrade now to continue enjoying:</p>
            <ul>
              <li>Up to 70 tasks/month</li>
              <li>10 courses</li>
              <li>50 Spaced Repetition Reminders</li>
              <li>Weekly Analytics</li>
            </ul>
            <p><a href="https://elaro.app/upgrade">Upgrade to Oddity</a></p>
          `,
          data: {
            type: 'trial_expired',
            action: 'upgrade',
            deep_link: 'elaro://paywall?variant=trial_expired',
            notification_id: notification.id,
          },
          options: {
            priority: 'high',
            badge: 1,
          },
          preferences: prefs,
        });

        if (result.pushSent || result.emailSent) {
          notifiedCount++;
          await logger.info(
            'Trial expiration notification sent',
            {
              user_id: user.id,
              push_sent: result.pushSent,
              email_sent: result.emailSent,
            },
            traceContext,
          );
        } else {
          await logger.warn(
            'Trial expiration notification blocked by preferences',
            {
              user_id: user.id,
            },
            traceContext,
          );
          skippedCount++;
        }
      } catch (userError: unknown) {
        // Log error for this user but continue with others
        errorCount++;
        await logger.error(
          'Error processing trial expiration notification for user',
          {
            user_id: user.id,
            error:
              userError instanceof Error
                ? userError.message
                : String(userError),
          },
          traceContext,
        );
      }
    }

    await logger.info(
      'Trial expiration notification job completed',
      {
        total_found: expiredTrials.length,
        notified: notifiedCount,
        skipped: skippedCount,
        errors: errorCount,
      },
      traceContext,
    );

    return {
      success: true,
      message: `Trial expiration notification job completed. Notified ${notifiedCount} users.`,
      notified_count: notifiedCount,
      skipped_count: skippedCount,
      error_count: errorCount,
    };
  } catch (error: unknown) {
    await logger.error(
      'Error in trial expiration notification job',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );
    throw error;
  }
}

serve(
  createScheduledHandler(handleNotifyTrialExpired, {
    requireSecret: true,
    secretEnvVar: 'CRON_SECRET',
  }),
);
