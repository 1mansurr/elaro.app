import { useCallback } from 'react';

export type LimitCheckResult = {
  allowed: boolean;
  limitType?: 'course' | 'activity' | 'reminder';
  currentUsage?: number;
  maxLimit?: number;
  actionLabel?: string;
  error?: string;
};

export const useLimitCheck = () => {
  /**
   * Check if user can add more courses
   */
  const checkCourseLimit = useCallback(async (): Promise<LimitCheckResult> => {
    return { allowed: true };
  }, []);

  /**
   * Check if user can add more activities (assignments, lectures, study sessions)
   */
  const checkActivityLimit =
    useCallback(async (): Promise<LimitCheckResult> => {
      return { allowed: true };
    }, []);

  /**
   * Check if user can add more SRS reminders
   */
  const checkSRSReminderLimit = useCallback(
    async (_currentReminders: number): Promise<LimitCheckResult> => {
      return { allowed: true };
    },
    [],
  );

  return {
    checkCourseLimit,
    checkActivityLimit,
    checkSRSReminderLimit,
  };
};
