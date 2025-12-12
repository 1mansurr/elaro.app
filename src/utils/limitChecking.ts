/**
 * Limit checking utilities
 * Helper functions for checking and formatting limit information
 */

/**
 * Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

/**
 * Format limit message based on limit type
 */
export function formatLimitMessage(
  limitType: 'course' | 'activity' | 'reminder',
  currentUsage: number,
  maxLimit: number,
): string {
  switch (limitType) {
    case 'course':
      return `You've reached your limit of ${maxLimit} courses.`;
    case 'activity':
      return `You've used ${currentUsage}/${maxLimit} activities this month.`;
    case 'reminder':
      return `You've used ${currentUsage}/${maxLimit} reminders this month.`;
  }
}

/**
 * Format action label (e.g., "Add 3rd Course")
 */
export function formatActionLabel(
  limitType: 'course' | 'activity' | 'reminder',
  nextCount: number,
): string {
  const ordinal = `${nextCount}${getOrdinalSuffix(nextCount)}`;
  
  switch (limitType) {
    case 'course':
      return `Add ${ordinal} Course`;
    case 'activity':
      return `Add ${ordinal} Activity`;
    case 'reminder':
      return `Add ${ordinal} Reminder`;
  }
}

/**
 * Check if a limit is reached
 */
export function isLimitReached(currentUsage: number, maxLimit: number): boolean {
  return currentUsage >= maxLimit;
}

/**
 * Check if adding one more item would exceed the limit
 */
export function wouldExceedLimit(
  currentUsage: number,
  maxLimit: number,
): boolean {
  return currentUsage + 1 > maxLimit;
}

