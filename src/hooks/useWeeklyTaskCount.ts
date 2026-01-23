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
  const { data: assignmentsData, isLoading: isLoadingAssignments } =
    useAssignments();
  const { data: lecturesData, isLoading: isLoadingLectures } = useLectures();
  const { data: studySessionsData, isLoading: isLoadingStudySessions } =
    useStudySessions();

  // Flatten InfiniteData to get all items
  const assignments = useMemo(() => {
    if (!assignmentsData?.pages) return [];
    return assignmentsData.pages.flatMap(page => page.assignments || []);
  }, [assignmentsData]);

  const lectures = useMemo(() => {
    if (!lecturesData?.pages) return [];
    return lecturesData.pages.flatMap(page => page.lectures || []);
  }, [lecturesData]);

  const studySessions = useMemo(() => {
    if (!studySessionsData?.pages) return [];
    return studySessionsData.pages.flatMap(page => page.studySessions || []);
  }, [studySessionsData]);

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
