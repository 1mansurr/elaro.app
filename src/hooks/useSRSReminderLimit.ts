import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { versionedApiClient } from '@/services/VersionedApiClient';

interface SRSReminderLimitResult {
  currentReminders: number;
  maxLimit: number;
  isAtLimit: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to track SRS reminder usage for the current month
 * Used to check if user can add more SRS reminders when creating study sessions
 */
export const useSRSReminderLimit = (): SRSReminderLimitResult => {
  const { user } = useAuth();
  const [currentReminders, setCurrentReminders] = useState(0);
  const [maxLimit] = useState(Infinity);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReminderCount = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Count SRS reminders created this month
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

      // Count study sessions with SRS created this month using API
      const { versionedApiClient } =
        await import('@/services/VersionedApiClient');
      const countResponse = await versionedApiClient.getCount(
        'study_sessions',
        {
          has_spaced_repetition: true,
          created_at: { operator: 'gte', value: oneMonthAgo.toISOString() },
        },
      );

      if (countResponse.error) {
        throw new Error(
          countResponse.message ||
            countResponse.error ||
            'Failed to count SRS reminders',
        );
      }

      setCurrentReminders(countResponse.data?.count || 0);
    } catch (err) {
      console.error('Error fetching SRS reminder count:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch reminder count',
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReminderCount();
  }, [fetchReminderCount]);

  const isAtLimit = maxLimit !== Infinity && currentReminders >= maxLimit;

  return {
    currentReminders,
    maxLimit,
    isAtLimit,
    isLoading,
    error,
  };
};
