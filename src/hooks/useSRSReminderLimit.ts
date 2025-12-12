import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { PermissionService } from '@/features/auth/permissions/PermissionService';

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
  const [maxLimit, setMaxLimit] = useState(5); // Default free plan limit
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
      // Get the limit for the user's subscription tier
      const permissionService = PermissionService.getInstance();
      const limits = await permissionService.getTaskLimits(user);
      const reminderLimit = limits.find(l => l.type === 'srs_reminders');

      if (reminderLimit) {
        setMaxLimit(
          reminderLimit.limit === -1 ? Infinity : reminderLimit.limit,
        );
      }

      // Count SRS reminders created this month
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

      // Count study sessions with SRS created this month
      const { count, error: countError } = await supabase
        .from('study_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('has_spaced_repetition', true)
        .gte('created_at', oneMonthAgo.toISOString());

      if (countError) {
        throw countError;
      }

      setCurrentReminders(count || 0);
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
