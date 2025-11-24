import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { sendPushNotification } from '../_shared/send-push-notification.ts';
import { sendUnifiedNotification } from '../_shared/unified-notification-sender.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import {
  getTodayBoundsInTimezone,
  getUserNotificationPreferences,
} from '../_shared/notification-helpers.ts';

// The core business logic for sending daily summaries
async function handleSendDailySummaries(supabaseAdminClient: SupabaseClient) {
  const traceContext = extractTraceContext(
    new Request('https://cron.internal'),
  );

  await logger.info(
    'Starting daily summary notifications job',
    {},
    traceContext,
  );

  // 1. Get all users who have morning summaries enabled and notifications enabled
  const { data: users, error: usersError } = await supabaseAdminClient
    .from('notification_preferences')
    .select(
      `
      user_id,
          email_notifications,
          push_notifications,
          master_toggle,
          do_not_disturb,
      user:users (
        id,
            email,
            first_name,
        timezone,
        user_devices (
          push_token
        )
      )
    `,
    )
    .eq('morning_summary_enabled', true);

  if (usersError) {
    throw handleDbError(usersError);
  }

  if (!users || users.length === 0) {
    await logger.info(
      'No users with morning summaries enabled',
      {},
      traceContext,
    );
    return { success: true, processedUsers: 0 };
  }

  await logger.info(
    'Found users to notify',
    { user_count: users.length },
    traceContext,
  );

  // 2. Process each user
  let successCount = 0;
  let failureCount = 0;

  for (const pref of users) {
    const user = pref.user; // The user object is now nested
    if (!user) continue;

    // Check if notifications are enabled
    if (pref.master_toggle === false || pref.do_not_disturb === true) {
      continue; // Skip if notifications disabled
    }

    try {
      // Get full preferences for unified sender (to avoid refetch)
      const userPrefs = await getUserNotificationPreferences(
        supabaseAdminClient,
        user.id,
      );
      if (!userPrefs) continue;

      const pushTokens = user.user_devices
        .map(d => d.push_token)
        .filter(Boolean);
      const timezone = user.timezone || 'UTC';

      // 3. Calculate the start and end of "today" in the user's timezone
      // This returns UTC Date objects representing today's boundaries in user timezone
      const { start: todayStart, end: todayEnd } =
        getTodayBoundsInTimezone(timezone);

      // 4. Fetch today's tasks for the user
      const [lecturesRes, assignmentsRes, studySessionsRes] = await Promise.all(
        [
          supabaseAdminClient
            .from('lectures')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .gte('start_time', todayStart.toISOString())
            .lt('start_time', todayEnd.toISOString()),
          supabaseAdminClient
            .from('assignments')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .gte('due_date', todayStart.toISOString())
            .lt('due_date', todayEnd.toISOString()),
          supabaseAdminClient
            .from('study_sessions')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .gte('session_date', todayStart.toISOString())
            .lt('session_date', todayEnd.toISOString()),
        ],
      );

      const lectureCount = lecturesRes.count || 0;
      const assignmentCount = assignmentsRes.count || 0;
      const studySessionCount = studySessionsRes.count || 0;
      const totalTasks = lectureCount + assignmentCount + studySessionCount;

      if (totalTasks === 0) {
        continue; // Don't send a notification if there's nothing scheduled
      }

      // 5. Construct the summary message
      let message = "Today's Plan: ";
      const parts = [];
      if (lectureCount > 0)
        parts.push(`${lectureCount} lecture${lectureCount > 1 ? 's' : ''}`);
      if (assignmentCount > 0)
        parts.push(
          `${assignmentCount} assignment${assignmentCount > 1 ? 's' : ''} due`,
        );
      if (studySessionCount > 0)
        parts.push(
          `${studySessionCount} study session${studySessionCount > 1 ? 's' : ''}`,
        );
      message += parts.join(', ') + '.';

      // 6. Send unified notification (push + email) respecting preferences
      // Pass preferences to avoid refetch in unified sender
      const emailSubject = 'Your Daily ELARO Summary';
      const emailContent = `
        <h2>Hi ${user.first_name || 'there'}! 👋</h2>
        <p>Here's your daily academic summary:</p>
        <ul>
          ${lectureCount > 0 ? `<li><strong>${lectureCount}</strong> lecture${lectureCount > 1 ? 's' : ''} scheduled</li>` : ''}
          ${assignmentCount > 0 ? `<li><strong>${assignmentCount}</strong> assignment${assignmentCount > 1 ? 's' : ''} due</li>` : ''}
          ${studySessionCount > 0 ? `<li><strong>${studySessionCount}</strong> study session${studySessionCount > 1 ? 's' : ''} planned</li>` : ''}
        </ul>
        <p>Stay on track and have a productive day! 🎓</p>
        <p><a href="https://elaro.app/dashboard">View Dashboard</a></p>
      `;

      const result = await sendUnifiedNotification(supabaseAdminClient, {
        userId: user.id,
        notificationType: 'daily_summary',
        title: "Here's your daily summary!",
        body: message,
        emailSubject,
        emailContent,
        data: {
          url: 'elaro://home',
          summaryType: 'daily',
          lectureCount,
          assignmentCount,
          studySessionCount,
        },
        options: {
          priority: 'normal',
          categoryId: 'daily_summary',
        },
        preferences: userPrefs, // Pass to avoid refetch
      });

      if (result.pushSent || result.emailSent) {
        successCount++;
      }
    } catch (error: unknown) {
      await logger.error(
        'Failed to process daily summary for user',
        {
          user_id: user.id,
          error: error instanceof Error ? error.message : String(error),
        },
        traceContext,
      );
      failureCount++;
      // Continue to the next user, don't fail the whole job
    }
  }

  const result = {
    success: true,
    totalUsers: users.length,
    notificationsSent: successCount,
    failures: failureCount,
  };

  await logger.info(
    'Finished daily summary notifications job',
    result,
    traceContext,
  );
  return result;
}

// Wrap the business logic with our secure, scheduled handler
serve(createScheduledHandler(handleSendDailySummaries));
