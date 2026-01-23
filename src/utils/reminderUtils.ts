// Helper function to format reminder minutes to human-readable labels
export const formatReminderLabel = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min before`;
  }
  if (minutes === 60) {
    return '1 hour before';
  }
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hours before`;
  }
  if (minutes === 1440) {
    return '1 day before';
  }
  const days = Math.floor(minutes / 1440);
  return `${days} days before`;
};

// Available reminder options (matching ReminderSelector)
export const REMINDER_OPTIONS = [
  { label: '5 min before', value: 5 },
  { label: '15 min before', value: 15 },
  { label: '30 min before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: '1 day before', value: 1440 },
];

/**
 * Snooze a reminder by rescheduling it
 */
export async function snoozeReminder(
  reminderId: string,
  minutes: number,
): Promise<void> {
  const { supabase } = await import('@/services/supabase');
  const newTime = new Date(Date.now() + minutes * 60 * 1000);
  
  await supabase
    .from('reminders')
    .update({ reminder_time: newTime.toISOString(), completed: false })
    .eq('id', reminderId);
}

/**
 * Cancel a reminder
 */
export async function cancelReminder(
  reminderId: string,
  reason?: string,
): Promise<void> {
  const { supabase } = await import('@/services/supabase');
  
  await supabase
    .from('reminders')
    .update({ completed: true })
    .eq('id', reminderId);
}

/**
 * Record SRS performance for a study session
 */
export async function recordSRSPerformance(
  sessionId: string,
  qualityRating: number,
  reminderId?: string,
  responseTimeSeconds?: number,
): Promise<{
  success: boolean;
  error?: string;
  nextIntervalDays?: number;
  easeFactor?: number;
  message?: string;
}> {
  const { supabase } = await import('@/services/supabase');
  
  try {
    const result = await supabase.functions.invoke('record-srs-performance', {
      body: {
        session_id: sessionId,
        reminder_id: reminderId,
        quality_rating: qualityRating,
        response_time_seconds: responseTimeSeconds,
      },
    });
    
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    
    return {
      success: true,
      nextIntervalDays: result.data?.next_interval_days,
      easeFactor: result.data?.ease_factor,
      message: result.data?.message,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get SRS statistics for a user
 */
export async function getSRSStatistics(
  userId: string,
): Promise<{
  total_reviews: number;
  average_quality: number;
  retention_rate: number;
  topics_reviewed: number;
  average_ease_factor: number;
  strongest_topics: Array<{
    session_id: string;
    topic: string;
    avg_quality: number;
    ease_factor: number;
  }>;
  weakest_topics: Array<{
    session_id: string;
    topic: string;
    avg_quality: number;
    ease_factor: number;
  }>;
} | null> {
  const { supabase } = await import('@/services/supabase');
  
  try {
    const result = await supabase.rpc('get_srs_statistics', {
      p_user_id: userId,
    });
    
    if (result.error) {
      console.error('Error getting SRS statistics:', result.error);
      return null;
    }
    
    return result.data?.[0] || null;
  } catch (error) {
    console.error('Error getting SRS statistics:', error);
    return null;
  }
}

/**
 * Get human-readable label for quality rating
 */
export function getQualityRatingLabel(rating: number): string {
  const labels = ['Very Hard', 'Hard', 'Medium', 'Good', 'Easy', 'Very Easy'];
  return labels[rating] || 'Unknown';
}

/**
 * Get color for quality rating
 */
export function getQualityRatingColor(rating: number): string {
  const colors = [
    '#FF0000', // Very Hard - Red
    '#FF6600', // Hard - Orange
    '#FFAA00', // Medium - Yellow-Orange
    '#FFDD00', // Good - Yellow
    '#88FF00', // Easy - Light Green
    '#00FF00', // Very Easy - Green
  ];
  return colors[rating] || '#CCCCCC';
}
