import { useMemo } from 'react';
import { useAssignments, useLectures, useStudySessions } from './useDataQueries';
import { useAuth } from '@/features/auth/contexts/AuthContext';

const WEEKLY_TASK_LIMIT = 5;

export const useWeeklyTaskCount = () => {
  const { user } = useAuth();
  const { data: assignments = [], isLoading: isLoadingAssignments } = useAssignments();
  const { data: lectures = [], isLoading: isLoadingLectures } = useLectures();
  const { data: studySessions = [], isLoading: isLoadingStudySessions } = useStudySessions();

  const weeklyTaskCount = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const filterTasksByDate = (tasks: Array<{ createdAt: string }>) =>
      tasks.filter(task => new Date(task.createdAt) >= oneWeekAgo).length;

    const weeklyAssignments = filterTasksByDate(assignments);
    const weeklyLectures = filterTasksByDate(lectures);
    const weeklyStudySessions = filterTasksByDate(studySessions);

    return weeklyAssignments + weeklyLectures + weeklyStudySessions;
  }, [assignments, lectures, studySessions]);

  const isPremium = user?.subscription_tier !== 'free';
  const limitReached = !isPremium && weeklyTaskCount >= WEEKLY_TASK_LIMIT;

  return {
    weeklyTaskCount,
    WEEKLY_TASK_LIMIT,
    isPremium,
    limitReached,
    isLoading: isLoadingAssignments || isLoadingLectures || isLoadingStudySessions,
  };
};
