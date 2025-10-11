import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler, SupabaseClient, AppError } from '../_shared/function-handler.ts';
import { sendPushNotification, NotificationResult } from '../_shared/send-push-notification.ts';

// This interface defines the shape of the data we expect from our complex query.
interface DueReminder {
  id: string;
  user_id: string;
  title: string;
  body: string;
  reminder_type: string;
  user?: {
    user_devices?: Array<{
      push_token: string;
    }>;
    notification_preferences?: {
      reminders_enabled: boolean;
      srs_reminders_enabled: boolean;
      assignment_reminders_enabled: boolean;
      lecture_reminders_enabled: boolean;
    };
  };
}

async function handleProcessDueReminders(supabaseAdmin: SupabaseClient) {
  console.log('--- Starting Due Reminders Processing Job ---');

  const now = new Date().toISOString();

  // Step 1: Enhanced query to join with notification_preferences and filter based on settings.
  const { data: dueReminders, error: fetchError } = await supabaseAdmin
    .from('reminders')
    .select(`
      id,
      user_id,
      title,
      body,
      reminder_type,
      user:users (
        user_devices (
          push_token
        ),
        notification_preferences (
          reminders_enabled,
          srs_reminders_enabled,
          assignment_reminders_enabled,
          lecture_reminders_enabled
        )
      )
    `)
    .eq('completed', false)
    .lte('reminder_time', now)
    // Filter based on preferences: master switch must be on AND specific type switch must be on
    .eq('user.notification_preferences.reminders_enabled', true)
    .filter('user.notification_preferences', 'not.is', null) // Ensure preferences exist
    .or(
      'and(reminder_type.eq.spaced_repetition, user.notification_preferences.srs_reminders_enabled.eq.true),' +
      'and(reminder_type.eq.assignment, user.notification_preferences.assignment_reminders_enabled.eq.true),' +
      'and(reminder_type.eq.lecture, user.notification_preferences.lecture_reminders_enabled.eq.true),' +
      // Study session reminders fall under the main reminders toggle
      'and(reminder_type.eq.study_session, user.notification_preferences.reminders_enabled.eq.true)'
    );

  if (fetchError) {
    throw new AppError('Failed to fetch due reminders.', 500, 'DB_FETCH_ERROR', fetchError);
  }

  if (!dueReminders || dueReminders.length === 0) {
    console.log('No due reminders to process that match user preferences.');
    return { success: true, processedCount: 0, successCount: 0, failureCount: 0 };
  }

  console.log(`Found ${dueReminders.length} due reminders to process (filtered by user preferences).`);

  // Step 2: Process each reminder and send notifications.
  const remindersToMarkComplete: string[] = [];
  let totalSuccessCount = 0;
  let totalFailureCount = 0;

  for (const reminder of dueReminders) {
    const pushTokens = reminder.user?.user_devices?.map((d) => d.push_token).filter(Boolean) || [];
    
    if (pushTokens.length > 0) {
      // Use fallback values if title/body are not set
      const title = reminder.title || 'Reminder';
      const body = reminder.body || 'You have a new reminder from ELARO.';
      
      const result = await sendPushNotification(
        supabaseAdmin,
        pushTokens,
        title,
        body,
        { reminderId: reminder.id }
      );

      // Only mark the reminder as complete if the notification was successfully sent.
      if (result.success) {
        remindersToMarkComplete.push(reminder.id);
      }
      totalSuccessCount += result.sentCount;
      totalFailureCount += result.failureCount;

    } else {
      // If there are no push tokens, we can consider the reminder "processed"
      // to prevent it from being picked up again.
      remindersToMarkComplete.push(reminder.id);
    }
  }

  console.log(`Attempted to send notifications. Successes: ${totalSuccessCount}, Failures: ${totalFailureCount}`);

  // Step 3: Mark the processed reminders as complete in a single bulk update.
  if (remindersToMarkComplete.length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('reminders')
      .update({ completed: true, processed_at: new Date().toISOString() }) // Also record when it was processed
      .in('id', remindersToMarkComplete);

    if (updateError) {
      // This is a critical error. If this fails, we might send duplicate notifications.
      // In a real production system, we'd have more robust error handling here,
      // but for now, logging it is crucial.
      console.error('CRITICAL: Failed to mark reminders as complete.', updateError);
      throw new AppError('Failed to update reminder statuses.', 500, 'DB_UPDATE_ERROR', updateError);
    }
    console.log(`Successfully marked ${remindersToMarkComplete.length} reminders as complete.`);
  }

  const result = {
    success: true,
    remindersFound: dueReminders.length,
    remindersProcessed: remindersToMarkComplete.length,
    notificationsSent: totalSuccessCount,
    notificationsFailed: totalFailureCount,
  };

  console.log('--- Finished Due Reminders Processing Job ---', result);
  return result;
}

// Wrap the business logic with our secure, scheduled handler.
// This job does not require a cron secret because it's not destructive and is idempotent.
// If it runs multiple times, it will only process reminders that are not yet complete.
serve(createScheduledHandler(handleProcessDueReminders));
