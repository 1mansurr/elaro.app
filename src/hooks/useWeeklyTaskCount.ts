import { useMemo } from 'react';
import {
  useAssignments,
  useLectures,
  useStudySessions,
} from './useDataQueries';
import { useAuth } from '@/contexts/AuthContext';

const MONTHLY_TASK_LIMITS = {
  free: 15,
  oddity: 70,
};

export const useMonthlyTaskCount = () => {
  const { user } = useAuth();
  const { data: assignments = [], isLoading: isLoadingAssignments } =
    useAssignments();
  const { data: lectures = [], isLoading: isLoadingLectures } = useLectures();
  const { data: studySessions = [], isLoading: isLoadingStudySessions } =
    useStudySessions();

  const monthlyTaskCount = useMemo(() => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    const filterTasksByDate = (
      tasks: Array<{ createdAt: string }> | undefined,
    ) => {
      // Defensive check: ensure tasks is an array before filtering
      if (!Array.isArray(tasks)) return 0;
      return tasks.filter(task => new Date(task.createdAt) >= oneMonthAgo)
        .length;
    };

    const monthlyAssignments = filterTasksByDate(assignments);
    const monthlyLectures = filterTasksByDate(lectures);
    const monthlyStudySessions = filterTasksByDate(studySessions);

    return monthlyAssignments + monthlyLectures + monthlyStudySessions;
  }, [assignments, lectures, studySessions]);

  const userTier = user?.subscription_tier || 'free';
  const monthlyLimit =
    MONTHLY_TASK_LIMITS[userTier] || MONTHLY_TASK_LIMITS.free;
  const isPremium = userTier !== 'free';
  const limitReached = !isPremium && monthlyTaskCount >= monthlyLimit;

  return {
    monthlyTaskCount,
    monthlyLimit,
    isPremium,
    limitReached,
    isLoading:
      isLoadingAssignments || isLoadingLectures || isLoadingStudySessions,
  };
};

// Keep the old hook for backward compatibility during transition
export const useWeeklyTaskCount = () => {
  const monthlyData = useMonthlyTaskCount();
  return {
    weeklyTaskCount: monthlyData.monthlyTaskCount,
    WEEKLY_TASK_LIMIT: monthlyData.monthlyLimit,
    isPremium: monthlyData.isPremium,
    limitReached: monthlyData.limitReached,
    isLoading: monthlyData.isLoading,
  };
};
