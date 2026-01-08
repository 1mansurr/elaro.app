/**
 * Shared Reminder Scheduling Service
 *
 * Consolidates all reminder scheduling logic into a single, consistent implementation.
 * This ensures all entry points (schedule-reminders, reminder-system, SRSSchedulingService)
 * produce identical reminder times for the same inputs.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { addDeterministicJitter } from './deterministic-jitter.ts';

export interface ScheduleReminderOptions {
  userId: string;
  sessionId: string;
  sessionDate: Date;
  daysOffset: number;
  topic: string;
  preferredHour?: number;
  jitterMinutes?: number;
  useDeterministicJitter?: boolean;
}

export interface ScheduledReminderData {
  user_id: string;
  session_id: string;
  reminder_time: string;
  reminder_type: 'spaced_repetition';
  title: string;
  body: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Schedule a single SRS reminder with timezone awareness and optional jitter
 *
 * This is the single source of truth for reminder scheduling logic.
 * All reminder scheduling functions should use this.
 */
export async function scheduleSRSReminder(
  supabaseClient: SupabaseClient,
  options: ScheduleReminderOptions,
): Promise<ScheduledReminderData> {
  const {
    userId,
    sessionId,
    sessionDate,
    daysOffset,
    topic,
    preferredHour = 10,
    jitterMinutes = 30,
    useDeterministicJitter = true, // Default to deterministic for consistency
  } = options;

  // Get user's optimal reminder hour if not provided
  let optimalHour = preferredHour;
  if (preferredHour === 10) {
    const { data: optimalHourData } = await supabaseClient.rpc(
      'get_optimal_reminder_hour',
      {
        p_user_id: userId,
        p_reminder_type: 'spaced_repetition',
      },
    );

    if (optimalHourData && typeof optimalHourData === 'number') {
      optimalHour = optimalHourData;
    }
  }

  // Use timezone-aware scheduling function
  const { data: timezoneAwareTime, error: tzError } = await supabaseClient.rpc(
    'schedule_reminder_in_user_timezone',
    {
      p_user_id: userId,
      p_base_time: sessionDate.toISOString(),
      p_days_offset: daysOffset,
      p_hour: optimalHour,
    },
  );

  let reminderTime: Date;

  if (tzError || !timezoneAwareTime) {
    // Fallback to UTC calculation if timezone conversion fails
    reminderTime = new Date(sessionDate);
    reminderTime.setDate(sessionDate.getDate() + daysOffset);
    reminderTime.setHours(optimalHour, 0, 0, 0);
  } else {
    reminderTime = new Date(timezoneAwareTime);
  }

  // Apply jitter (deterministic or random)
  let jitteredTime: Date;
  if (useDeterministicJitter) {
    // Use session ID + days offset as seed for deterministic jitter
    const seed = `${sessionId}-${daysOffset}`;
    jitteredTime = addDeterministicJitter(reminderTime, jitterMinutes, seed);
  } else {
    // Use random jitter
    const { addRandomJitter } = await import('./deterministic-jitter.ts');
    jitteredTime = addRandomJitter(reminderTime, jitterMinutes);
  }

  return {
    user_id: userId,
    session_id: sessionId,
    reminder_time: jitteredTime.toISOString(),
    reminder_type: 'spaced_repetition',
    title: `Spaced Repetition: Review "${topic}"`,
    body: `It's time to review your study session on "${topic}" to strengthen your memory.`,
    completed: false,
    priority: 'medium',
  };
}

/**
 * Schedule multiple SRS reminders for different intervals
 *
 * @param supabaseClient - Supabase client instance
 * @param options - Scheduling options (with intervals array)
 * @returns Array of scheduled reminder data
 */
export interface ScheduleMultipleRemindersOptions extends Omit<
  ScheduleReminderOptions,
  'daysOffset'
> {
  intervals: number[]; // Array of day offsets (e.g., [1, 3, 7, 14])
}

export async function scheduleMultipleSRSReminders(
  supabaseClient: SupabaseClient,
  options: ScheduleMultipleRemindersOptions,
): Promise<ScheduledReminderData[]> {
  const { intervals, ...baseOptions } = options;

  const reminders = await Promise.all(
    intervals.map(daysOffset => {
      return scheduleSRSReminder(supabaseClient, {
        ...baseOptions,
        daysOffset,
      });
    }),
  );

  return reminders;
}

/**
 * Cancel all incomplete future reminders for a session before scheduling new ones
 * Prevents duplicate reminders from accumulating
 *
 * @param supabaseClient - Supabase client instance
 * @param userId - User ID
 * @param sessionId - Session ID
 * @returns Number of reminders cancelled
 */
export async function cancelExistingSRSReminders(
  supabaseClient: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<number> {
  const now = new Date().toISOString();

  const { data: cancelled, error } = await supabaseClient
    .from('reminders')
    .update({
      completed: true,
      processed_at: now,
      action_taken: 'rescheduled',
      dismissed_at: now,
    })
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .in('reminder_type', ['spaced_repetition', 'srs_review']) // Handle both types during migration
    .eq('completed', false)
    .gt('reminder_time', now) // Only cancel future reminders
    .select();

  if (error) {
    console.error('Error cancelling existing reminders:', error);
    return 0;
  }

  return cancelled?.length || 0;
}
