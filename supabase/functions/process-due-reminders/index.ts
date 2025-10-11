import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler, SupabaseClient, AppError } from '../_shared/function-handler.ts';
import { sendPushNotification } from '../_shared/send-push-notification.ts';

// This interface defines the shape of the data we expect from our complex query.
interface DueReminder {
  id: string;
  user_id: string;
  title: string;
  body: string;
  user?: {
    user_devices?: Array<{
      push_token: string;
    }>;
  };
}

async function handleProcessDueReminders(supabaseAdmin: SupabaseClient) {
  console.log('--- Starting Due Reminders Processing Job ---');

  const now = new Date().toISOString();

  // Step 1: Fetch all due reminders along with the user's push tokens.
  // This is a complex query that joins reminders, users, and user_devices.
  const { data: dueReminders, error: fetchError } = await supabaseAdmin
    .from('reminders')
    .select(`
      id,
      user_id,
      title,
      body,
      user:users (
        user_devices (
          push_token
        )
      )
    `)
    .eq('completed', false)
    .lte('reminder_time', now);

  if (fetchError) {
    throw new AppError('Failed to fetch due reminders.', 500, 'DB_FETCH_ERROR', fetchError);
  }

  if (!dueReminders || dueReminders.length === 0) {
    console.log('No due reminders to process.');
    return { success: true, processedCount: 0 };
  }

  console.log(`Found ${dueReminders.length} due reminders to process.`);

  // Step 2: Process each reminder and send notifications.
  const processedReminderIds: string[] = [];
  const notificationPromises = dueReminders.map((reminder: DueReminder) => {
    // Flatten the push tokens from the nested structure.
    const pushTokens = reminder.user?.user_devices?.map((d) => d.push_token).filter(Boolean) || [];
    
    if (pushTokens.length > 0) {
      processedReminderIds.push(reminder.id);
      
      // Use fallback values if title/body are not set
      const title = reminder.title || 'Reminder';
      const body = reminder.body || 'You have a scheduled reminder';
      
      return sendPushNotification(pushTokens, title, body);
    }
    return Promise.resolve(); // No push token, do nothing.
  });

  // Wait for all notifications to be sent (or attempt to be sent).
  await Promise.all(notificationPromises);
  console.log(`Attempted to send notifications for ${processedReminderIds.length} reminders.`);

  // Step 3: Mark the processed reminders as complete in a single bulk update.
  if (processedReminderIds.length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('reminders')
      .update({ completed: true, processed_at: new Date().toISOString() }) // Also record when it was processed
      .in('id', processedReminderIds);

    if (updateError) {
      // This is a critical error. If this fails, we might send duplicate notifications.
      // In a real production system, we'd have more robust error handling here,
      // but for now, logging it is crucial.
      console.error('CRITICAL: Failed to mark reminders as complete. Risk of duplicates.', updateError);
      throw new AppError('Failed to update reminder statuses.', 500, 'DB_UPDATE_ERROR', updateError);
    }
    console.log(`Successfully marked ${processedReminderIds.length} reminders as complete.`);
  }

  const result = {
    success: true,
    processedCount: processedReminderIds.length,
  };

  console.log('--- Finished Due Reminders Processing Job ---', result);
  return result;
}

// Wrap the business logic with our secure, scheduled handler.
// This job does not require a cron secret because it's not destructive and is idempotent.
// If it runs multiple times, it will only process reminders that are not yet complete.
serve(createScheduledHandler(handleProcessDueReminders));
