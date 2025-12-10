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
