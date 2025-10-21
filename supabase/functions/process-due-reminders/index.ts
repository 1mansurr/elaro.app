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
  session_id?: string;
  assignment_id?: string;
  lecture_id?: string;
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

// Helper function to generate deep link URLs for reminders
function generateDeepLinkUrl(reminder: DueReminder): string {
  // Map reminder_type to URL path segments
  const typeMap: Record<string, string> = {
    'assignment': 'assignment',
    'lecture': 'lecture',
    'study_session': 'study-session',
    'spaced_repetition': 'study-session', // SRS reminders link to study sessions
  };

  const urlType = typeMap[reminder.reminder_type] || 'task';
  const itemId = reminder.session_id || reminder.assignment_id || reminder.lecture_id;
  
  if (!itemId) {
    return 'elaro://home'; // Fallback to home if no ID
  }

  return `elaro://${urlType}/${itemId}`;
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
      session_id,
      assignment_id,
      lecture_id,
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

  // Step 2: Filter out reminders in quiet hours
  const remindersToProcess: DueReminder[] = [];
  const remindersInQuietHours: string[] = [];

  for (const reminder of dueReminders) {
    // Check if reminder is in user's quiet hours
    const { data: inQuietHours } = await supabaseAdmin
      .rpc('is_in_quiet_hours', {
        p_user_id: reminder.user_id,
        p_check_time: now,
      });

    if (inQuietHours) {
      console.log(`Reminder ${reminder.id} is in quiet hours, skipping for now`);
      remindersInQuietHours.push(reminder.id);
    } else {
      remindersToProcess.push(reminder);
    }
  }

  console.log(`Processing ${remindersToProcess.length} reminders (${remindersInQuietHours.length} in quiet hours)`);

  // Step 3: Process each reminder and send notifications.
  const remindersToMarkComplete: string[] = [];
  let totalSuccessCount = 0;
  let totalFailureCount = 0;

  for (const reminder of remindersToProcess) {
    const pushTokens = reminder.user?.user_devices?.map((d) => d.push_token).filter(Boolean) || [];
    
    if (pushTokens.length > 0) {
      // Use fallback values if title/body are not set
      const title = reminder.title || 'Reminder';
      const body = reminder.body || 'You have a new reminder from ELARO.';
      
      // Generate deep link URL for the reminder
      const deepLinkUrl = generateDeepLinkUrl(reminder);
      const itemId = reminder.session_id || reminder.assignment_id || reminder.lecture_id;
      const taskType = reminder.reminder_type === 'spaced_repetition' ? 'study_session' : reminder.reminder_type;
      
      // Determine category and priority based on reminder type
      const categoryMap: Record<string, string> = {
        'assignment': 'assignment',
        'lecture': 'lecture',
        'spaced_repetition': 'srs_review',
        'study_session': 'srs_review',
      };
      
      const category = categoryMap[reminder.reminder_type] || undefined;
      
      const result = await sendPushNotification(
        supabaseAdmin,
        pushTokens,
        title,
        body,
        { 
          reminderId: reminder.id,
          url: deepLinkUrl,
          itemId: itemId,
          taskType: taskType,
        },
        {
          priority: 'high',
          categoryId: category,
        }
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

  // Step 4: Mark the processed reminders as complete and record sent time
  if (remindersToMarkComplete.length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('reminders')
      .update({ 
        completed: true, 
        processed_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
      })
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
