// Offline MVP stub — all Supabase/API calls removed
import * as Notifications from 'expo-notifications';

export interface RescheduleReminderOptions {
  reminderId: string;
  newScheduledTime: Date;
  userId: string;
}

export async function rescheduleReminder(
  _options: RescheduleReminderOptions,
): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Not available in offline mode' };
}
