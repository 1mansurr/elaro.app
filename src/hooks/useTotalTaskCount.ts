import { useMemo } from 'react';
import { useAssignments, useLectures, useStudySessions } from './useDataQueries'; // Assuming these hooks exist and fetch all tasks

export const useTotalTaskCount = () => {
  const { data: assignments, isLoading: isLoadingAssignments } = useAssignments();
  const { data: lectures, isLoading: isLoadingLectures } = useLectures();
  const { data: studySessions, isLoading: isLoadingStudySessions } = useStudySessions();

  const totalTaskCount = useMemo(() => {
    if (!assignments || !lectures || !studySessions) {
      return null; // Return null if data is not yet available
    }
    return (assignments?.length || 0) + (lectures?.length || 0) + (studySessions?.length || 0);
  }, [assignments, lectures, studySessions]);

  const isLoading = isLoadingAssignments || isLoadingLectures || isLoadingStudySessions;

  return {
    totalTaskCount,
    isLoading,
    isFirstTask: totalTaskCount === 0,
  };
};
