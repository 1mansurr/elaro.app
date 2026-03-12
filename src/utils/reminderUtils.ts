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
 * Snooze a reminder by rescheduling it (offline — no-op)
 */
export async function snoozeReminder(
  _reminderId: string,
  _minutes: number,
): Promise<void> {
  // Offline mode — no-op
}

/**
 * Cancel a reminder (offline — no-op)
 */
export async function cancelReminder(
  _reminderId: string,
  _reason?: string,
): Promise<void> {
  // Offline mode — no-op
}

/**
 * Record SRS performance for a study session (offline — not available)
 */
export async function recordSRSPerformance(
  _sessionId: string,
  _qualityRating: number,
  _reminderId?: string,
  _responseTimeSeconds?: number,
): Promise<{
  success: boolean;
  error?: string;
  nextIntervalDays?: number;
  easeFactor?: number;
  message?: string;
}> {
  return { success: false, error: 'Not available in offline mode' };
}

/**
 * Get SRS statistics for a user (offline — not available)
 */
export async function getSRSStatistics(_userId: string): Promise<null> {
  return null;
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
