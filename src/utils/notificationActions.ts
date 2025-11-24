import { supabase } from '@/services/supabase';
import { snoozeReminder, cancelReminder } from './reminderUtils';
import * as Notifications from 'expo-notifications';

/**
 * Handle notification action responses (button taps)
 */
export async function handleNotificationAction(
  actionIdentifier: string,
  notification: Notifications.Notification,
): Promise<void> {
  const data = notification.request.content.data;
  const reminderId = data?.reminderId as string | undefined;
  const taskId = data?.itemId as string | undefined;
  const taskType = data?.taskType as string | undefined;

  console.log('Handling notification action:', actionIdentifier, data);

  try {
    switch (actionIdentifier) {
      case 'complete':
        await handleCompleteAction(taskId, taskType, reminderId);
        break;

      case 'snooze':
        await handleSnoozeAction(reminderId);
        break;

      case 'review_now':
        // Will open app via opensAppToForeground: true
        console.log('Opening app for review');
        break;

      case 'view_details':
      case 'view_tasks':
        // Will open app via opensAppToForeground: true
        console.log('Opening app for details');
        break;

      case 'dismiss':
        await handleDismissAction(reminderId);
        break;

      default:
        console.log('Unknown action:', actionIdentifier);
    }
  } catch (error) {
    console.error('Error handling notification action:', error);
  }
}

/**
 * Handle complete action
 */
async function handleCompleteAction(
  taskId?: string,
  taskType?: string,
  reminderId?: string,
): Promise<void> {
  console.log('Completing task:', taskId, taskType);

  if (!taskId || !taskType) {
    console.warn('No task ID or type provided');
    return;
  }

  try {
    // Mark task as completed in database
    const table = getTableName(taskType);

    // For assignments, we could add a 'completed' field
    // For now, just log the action
    console.log(`Would mark ${taskType} ${taskId} as complete`);

    // Cancel the reminder
    if (reminderId) {
      await cancelReminder(reminderId, 'task_completed');
    }

    // Track analytics
    await supabase.from('reminder_analytics').insert({
      reminder_id: reminderId,
      action_taken: 'completed_from_notification',
      effectiveness_score: 1.0,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
    });
  } catch (error) {
    console.error('Error completing task from notification:', error);
  }
}

/**
 * Handle snooze action
 */
async function handleSnoozeAction(reminderId?: string): Promise<void> {
  console.log('Snoozing reminder:', reminderId);

  if (!reminderId) {
    console.warn('No reminder ID provided');
    return;
  }

  try {
    // Snooze for 1 hour
    await snoozeReminder(reminderId, 60);

    // Track analytics
    await supabase.from('reminder_analytics').insert({
      reminder_id: reminderId,
      action_taken: 'snoozed',
      effectiveness_score: 0.5,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
    });

    console.log('Reminder snoozed for 1 hour');
  } catch (error) {
    console.error('Error snoozing reminder:', error);
  }
}

/**
 * Handle dismiss action
 */
async function handleDismissAction(reminderId?: string): Promise<void> {
  console.log('Dismissing reminder:', reminderId);

  if (!reminderId) {
    console.warn('No reminder ID provided');
    return;
  }

  try {
    await supabase
      .from('reminders')
      .update({
        dismissed_at: new Date().toISOString(),
        action_taken: 'dismissed',
      })
      .eq('id', reminderId);

    // Track analytics
    await supabase.from('reminder_analytics').insert({
      reminder_id: reminderId,
      action_taken: 'dismissed',
      effectiveness_score: 0,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
    });
  } catch (error) {
    console.error('Error dismissing reminder:', error);
  }
}

/**
 * Get table name from task type
 */
function getTableName(taskType: string): string {
  const tableMap: Record<string, string> = {
    assignment: 'assignments',
    lecture: 'lectures',
    study_session: 'study_sessions',
  };
  return tableMap[taskType] || 'tasks';
}

/**
 * Track notification opened
 */
export async function trackNotificationOpened(
  notificationId: string,
  reminderId?: string,
): Promise<void> {
  try {
    const now = new Date().toISOString();

    // Update reminder if provided
    if (reminderId) {
      await supabase
        .from('reminders')
        .update({ opened_at: now })
        .eq('id', reminderId);
    }

    // Track in analytics
    if (reminderId) {
      await supabase.from('reminder_analytics').upsert({
        reminder_id: reminderId,
        opened: true,
        action_taken: 'opened',
        effectiveness_score: 0.5,
        hour_of_day: new Date().getHours(),
        day_of_week: new Date().getDay(),
      });
    }

    // Update delivery record
    await supabase
      .from('notification_deliveries')
      .update({
        opened_at: now,
        clicked_at: now,
      })
      .eq('metadata->reminderId', reminderId);

    console.log('Notification open tracked');
  } catch (error) {
    console.error('Error tracking notification open:', error);
  }
}
