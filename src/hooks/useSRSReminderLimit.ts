interface SRSReminderLimitResult {
  currentReminders: number;
  maxLimit: number;
  isAtLimit: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useSRSReminderLimit = (): SRSReminderLimitResult => {
  return {
    currentReminders: 0,
    maxLimit: Infinity,
    isAtLimit: false,
    isLoading: false,
    error: null,
  };
};
