import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionService } from '@/features/auth/permissions/PermissionService';
import { useMonthlyTaskCount } from './useMonthlyTaskCount';
import { formatActionLabel } from '@/utils/limitChecking';

export type LimitCheckResult = {
  allowed: boolean;
  limitType?: 'course' | 'activity' | 'reminder';
  currentUsage?: number;
  maxLimit?: number;
  actionLabel?: string;
  error?: string;
};

export const useLimitCheck = () => {
  const { user } = useAuth();
  const { monthlyTaskCount, monthlyLimit } = useMonthlyTaskCount();
  const [isChecking, setIsChecking] = useState(false);

  /**
   * Check if user can add more courses
   */
  const checkCourseLimit = useCallback(async (): Promise<LimitCheckResult> => {
    if (!user) {
      return { allowed: false, error: 'User not authenticated' };
    }

    setIsChecking(true);
    try {
      const permissionService = PermissionService.getInstance();
      const limits = await permissionService.getTaskLimits(user);
      const courseLimit = limits.find(l => l.type === 'courses');

      if (!courseLimit) {
        return { allowed: false, error: 'Could not check course limit' };
      }

      // Premium and admin users have unlimited
      if (courseLimit.limit === -1) {
        return { allowed: true };
      }

      if (!courseLimit.allowed) {
        const nextCount = courseLimit.current + 1;
        return {
          allowed: false,
          limitType: 'course',
          currentUsage: courseLimit.current,
          maxLimit: courseLimit.limit,
          actionLabel: formatActionLabel('course', nextCount),
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking course limit:', error);
      return {
        allowed: false,
        error: error instanceof Error ? error.message : 'Failed to check course limit',
      };
    } finally {
      setIsChecking(false);
    }
  }, [user]);

  /**
   * Check if user can add more activities (assignments, lectures, study sessions)
   */
  const checkActivityLimit = useCallback(async (): Promise<LimitCheckResult> => {
    if (!user) {
      return { allowed: false, error: 'User not authenticated' };
    }

    // Premium users have unlimited
    if (user.subscription_tier !== 'free') {
      return { allowed: true };
    }

    if (monthlyTaskCount >= monthlyLimit) {
      const nextCount = monthlyTaskCount + 1;
      return {
        allowed: false,
        limitType: 'activity',
        currentUsage: monthlyTaskCount,
        maxLimit: monthlyLimit,
        actionLabel: formatActionLabel('activity', nextCount),
      };
    }

    return { allowed: true };
  }, [user, monthlyTaskCount, monthlyLimit]);

  /**
   * Check if user can add more SRS reminders
   */
  const checkSRSReminderLimit = useCallback(
    async (currentReminders: number): Promise<LimitCheckResult> => {
      if (!user) {
        return { allowed: false, error: 'User not authenticated' };
      }

      setIsChecking(true);
      try {
        const permissionService = PermissionService.getInstance();
        const limits = await permissionService.getTaskLimits(user);
        const reminderLimit = limits.find(l => l.type === 'srs_reminders');

        if (!reminderLimit) {
          return { allowed: false, error: 'Could not check reminder limit' };
        }

        // Premium and admin users have unlimited
        if (reminderLimit.limit === -1) {
          return { allowed: true };
        }

        // Check if adding one more would exceed limit
        if (currentReminders + 1 > reminderLimit.limit) {
          const nextCount = currentReminders + 1;
          return {
            allowed: false,
            limitType: 'reminder',
            currentUsage: currentReminders,
            maxLimit: reminderLimit.limit,
            actionLabel: formatActionLabel('reminder', nextCount),
          };
        }

        return { allowed: true };
      } catch (error) {
        console.error('Error checking SRS reminder limit:', error);
        return {
          allowed: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to check reminder limit',
        };
      } finally {
        setIsChecking(false);
      }
    },
    [user],
  );

  return {
    checkCourseLimit,
    checkActivityLimit,
    checkSRSReminderLimit,
    isChecking,
  };
};

