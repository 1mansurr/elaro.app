import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';

export interface RescheduleReminderOptions {
  reminderId: string;
  newScheduledTime: Date;
  userId: string;
}

/**
 * Reschedule a reminder to a new time
 * This handles:
 * - Canceling the old scheduled notification
 * - Scheduling a new notification
 * - Updating the reminder in the database
 */
export async function rescheduleReminder(
  options: RescheduleReminderOptions,
): Promise<{ success: boolean; error?: string }> {
  const { reminderId, newScheduledTime, userId } = options;

  try {
    // 1. Get existing reminder
    const { data: reminder, error: fetchError } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', reminderId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !reminder) {
      return { success: false, error: 'Reminder not found' };
    }

    // 2. Cancel old scheduled notification (if exists)
    if (reminder.notification_id) {
      try {
        await Notifications.cancelScheduledNotificationAsync(
          reminder.notification_id,
        );
      } catch (cancelError) {
        console.warn('Failed to cancel old notification:', cancelError);
        // Continue anyway - notification might not exist
      }
    }

    // 3. Schedule new notification
    let notificationId: string;
    try {
      notificationId = await Notifications.scheduleNotificationAsync({
        identifier: reminderId,
        content: {
          title: reminder.title || 'Reminder',
          body: reminder.body || 'You have a reminder',
          data: reminder.data || {},
        },
        trigger: {
          date: newScheduledTime,
        },
      });
    } catch (scheduleError) {
      console.error('Failed to schedule notification:', scheduleError);
      return {
        success: false,
        error:
          scheduleError instanceof Error
            ? scheduleError.message
            : 'Failed to schedule notification',
      };
    }

    // 4. Update reminder via Edge Function
    const { data, error } = await supabase.functions.invoke(
      'reschedule-reminder',
      {
        body: {
          reminder_id: reminderId,
          new_scheduled_time: newScheduledTime.toISOString(),
          notification_id: notificationId,
        },
      },
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error rescheduling reminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
