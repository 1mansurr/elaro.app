import { supabase } from '@/services/supabase';

export interface ReminderConflict {
  conflicting_reminder_id: string;
  conflict_time: string;
  conflict_title: string;
}

/**
 * Cancel a reminder
 */
export async function cancelReminder(
  reminderId: string,
  reason?: 'not_needed' | 'rescheduled' | 'task_completed' | 'other',
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('cancel-reminder', {
      body: {
        reminder_id: reminderId,
        reason,
      },
    });

    if (error) {
      console.error('Error cancelling reminder:', error);
      return { success: false, error: error.message };
    }

    console.log('Reminder cancelled successfully');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error in cancelReminder:', error);
    const err = error as { message?: string };
    return {
      success: false,
      error: err?.message || 'Failed to cancel reminder',
    };
  }
}

/**
 * Check for reminder conflicts
 */
export async function checkReminderConflicts(
  reminderTime: Date,
  bufferMinutes: number = 15,
): Promise<ReminderConflict[]> {
  try {
    const { data, error } = await supabase.rpc('check_reminder_conflicts', {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_reminder_time: reminderTime.toISOString(),
      p_buffer_minutes: bufferMinutes,
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error checking conflicts:', error);
    return [];
  }
}

/**
 * Record SRS performance and get next interval
 */
export async function recordSRSPerformance(
  sessionId: string,
  qualityRating: number,
  reminderId?: string,
  responseTimeSeconds?: number,
): Promise<{
  success: boolean;
  nextIntervalDays?: number;
  easeFactor?: number;
  message?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'record-srs-performance',
      {
        body: {
          session_id: sessionId,
          reminder_id: reminderId,
          quality_rating: qualityRating,
          response_time_seconds: responseTimeSeconds,
          schedule_next: true,
        },
      },
    );

    if (error) {
      console.error('Error recording SRS performance:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      nextIntervalDays: data.next_interval_days,
      easeFactor: data.ease_factor,
      message: data.message,
    };
  } catch (error: unknown) {
    console.error('Error in recordSRSPerformance:', error);
    const err = error as { message?: string };
    return {
      success: false,
      error: err?.message || 'Failed to record performance',
    };
  }
}

/**
 * Get SRS statistics for the user
 */
export async function getSRSStatistics(userId: string): Promise<{
  total_reviews: number;
  average_quality: number;
  retention_rate: number;
  topics_reviewed: number;
  average_ease_factor: number;
  strongest_topics: Array<{ topic: string; score: number }>;
  weakest_topics: Array<{ topic: string; score: number }>;
} | null> {
  try {
    const { data, error } = await supabase.rpc('get_srs_statistics', {
      p_user_id: userId,
    });

    if (error) throw error;

    return data?.[0] || null;
  } catch (error) {
    console.error('Error getting SRS statistics:', error);
    return null;
  }
}

/**
 * Get quality rating label
 */
export function getQualityRatingLabel(rating: number): string {
  const labels: Record<number, string> = {
    0: 'Complete Blackout',
    1: 'Incorrect',
    2: 'Correct with Effort',
    3: 'Correct with Hesitation',
    4: 'Correct Easily',
    5: 'Perfect Recall',
  };
  return labels[rating] || 'Unknown';
}

/**
 * Get quality rating color
 */
export function getQualityRatingColor(rating: number): string {
  if (rating === 0) return '#DC2626'; // Red
  if (rating === 1) return '#EF4444'; // Light red
  if (rating === 2) return '#F59E0B'; // Orange
  if (rating === 3) return '#FBBF24'; // Yellow
  if (rating === 4) return '#10B981'; // Green
  if (rating === 5) return '#059669'; // Dark green
  return '#6B7280'; // Gray
}

/**
 * Update reminder when user dismisses it
 */
export async function dismissReminder(reminderId: string): Promise<void> {
  try {
    await supabase
      .from('reminders')
      .update({
        dismissed_at: new Date().toISOString(),
        action_taken: 'dismissed',
      })
      .eq('id', reminderId);

    // Record analytics
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
 * Update reminder when user opens it
 */
export async function markReminderOpened(reminderId: string): Promise<void> {
  try {
    await supabase
      .from('reminders')
      .update({
        opened_at: new Date().toISOString(),
      })
      .eq('id', reminderId);

    // Record analytics
    await supabase.from('reminder_analytics').insert({
      reminder_id: reminderId,
      opened: true,
      action_taken: 'opened',
      effectiveness_score: 0.5,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
    });
  } catch (error) {
    console.error('Error marking reminder opened:', error);
  }
}

/**
 * Snooze a reminder for specified minutes
 */
export async function snoozeReminder(
  reminderId: string,
  snoozeMinutes: number = 60,
): Promise<{ success: boolean; error?: string }> {
  try {
    const snoozeUntil = new Date(Date.now() + snoozeMinutes * 60000);

    const { error } = await supabase
      .from('reminders')
      .update({
        snoozed_until: snoozeUntil.toISOString(),
        completed: false, // Keep as incomplete so it can be processed again
      })
      .eq('id', reminderId);

    if (error) throw error;

    return { success: true };
  } catch (error: unknown) {
    console.error('Error snoozing reminder:', error);
    const err = error as { message?: string };
    return {
      success: false,
      error: err?.message || 'Failed to snooze reminder',
    };
  }
}
