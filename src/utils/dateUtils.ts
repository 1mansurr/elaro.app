export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export const formatDateTime = (date: Date | string, time?: string): string => {
  const formattedDate = formatDate(date);
  if (time) {
    return `${formattedDate} at ${formatTime(time)}`;
  }
  return formattedDate;
};

export const isToday = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

export const isTomorrow = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d.toDateString() === tomorrow.toDateString();
};

export const isThisWeek = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  return d >= startOfWeek && d <= endOfWeek;
};

export const getWeekStart = (date: Date = new Date()): Date => {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
};

export const getWeekEnd = (date: Date = new Date()): Date => {
  const end = new Date(date);
  end.setDate(date.getDate() - date.getDay() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const getSpacedRepetitionDates = (
  sessionDate: Date,
  days: number[]
): Date[] => {
  return days.map(day => addDays(sessionDate, day));
};

export const getRelativeDateString = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(d)) {
    return 'Today';
  }
  
  if (isTomorrow(d)) {
    return 'Tomorrow';
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  return formatDate(d);
};

/**
 * Determines if deleting a task/event should decrement the user's usage count.
 * @param task { completed: boolean, date_time: string | Date }
 * @returns boolean
 *
 * Rules:
 * - If completed: never decrement (return false)
 * - If incomplete:
 *    - If deleted >=24h before dueAt: decrement (return true)
 *    - If deleted <24h before dueAt: do not decrement (return false)
 */
export function shouldDecrementUsageOnDelete(task: { completed: boolean; date_time: string | Date }): boolean {
  if (task.completed) return false;
  const dueAt = typeof task.date_time === 'string' ? new Date(task.date_time) : task.date_time;
  const now = new Date();
  const msDiff = dueAt.getTime() - now.getTime();
  const hoursDiff = msDiff / (1000 * 60 * 60);
  return hoursDiff >= 24;
}

