import { useMemo } from 'react';
import {
  useAssignments,
  useLectures,
  useStudySessions,
} from './useDataQueries'; // Assuming these hooks exist and fetch all tasks

export const useTotalTaskCount = () => {
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

  const totalTaskCount = useMemo(() => {
    return (
      (assignments?.length || 0) +
      (lectures?.length || 0) +
      (studySessions?.length || 0)
    );
  }, [assignments, lectures, studySessions]);

  const isLoading =
    isLoadingAssignments || isLoadingLectures || isLoadingStudySessions;

  return {
    totalTaskCount,
    isLoading,
    isFirstTask: totalTaskCount === 0,
  };
};
