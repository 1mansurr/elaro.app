import { differenceInDays, differenceInHours, format } from 'date-fns';

/**
 * Calculate countdown text for due date
 * Returns "Due in X days" or "Due in X hours" or "Overdue"
 */
export const formatCountdown = (dueDate: string | Date): string => {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const now = new Date();

  if (due < now) {
    return 'Overdue';
  }

  const daysDiff = differenceInDays(due, now);
  const hoursDiff = differenceInHours(due, now);

  if (daysDiff === 0) {
    if (hoursDiff < 1) {
      return 'Due soon';
    }
    return `Due in ${hoursDiff} hour${hoursDiff > 1 ? 's' : ''}`;
  }

  if (daysDiff === 1) {
    return 'Due tomorrow';
  }

  return `Due in ${daysDiff} days`;
};

/**
 * Format recurrence pattern to human-readable text
 */
export const formatRecurrenceLabel = (
  isRecurring: boolean,
  pattern?: string | null,
): string => {
  if (!isRecurring || !pattern) {
    return 'One-time';
  }

  switch (pattern) {
    case 'weekly':
      return 'Repeats Weekly';
    case 'bi-weekly':
      return 'Repeats Bi-weekly';
    default:
      return 'Repeats';
  }
};

/**
 * Format duration between two dates
 */
export const formatDuration = (
  startTime: string | Date,
  endTime: string | Date,
): string => {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;

  const diffMinutes = Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60),
  );

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
};

/**
 * Format date and time for display
 */
export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM dd, yyyy • h:mm a');
};

/**
 * Format date only
 */
export const formatDateOnly = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM dd, yyyy');
};

/**
 * Format time only
 */
export const formatTimeOnly = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'h:mm a');
};
