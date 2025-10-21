import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Course, Assignment, Lecture, StudySession, HomeScreenData, CalendarData } from '@/types';

export const useCourses = (searchQuery?: string) => {
  return useQuery<Course[], Error>({
    queryKey: ['courses', searchQuery || ''], // Include searchQuery in the query key
    queryFn: () => api.courses.getAll(searchQuery),
  });
};

export const useAssignments = () => {
  return useQuery<Assignment[], Error>({
    queryKey: ['assignments'],
    queryFn: api.assignments.getAll,
  });
};

export const useLectures = () => {
  return useQuery<Lecture[], Error>({
    queryKey: ['lectures'],
    queryFn: api.lectures.getAll,
  });
};

export const useStudySessions = () => {
  return useQuery<StudySession[], Error>({
    queryKey: ['studySessions'],
    queryFn: api.studySessions.getAll,
  });
};

export const useHomeScreenData = (enabled: boolean = true) => {
  return useQuery<HomeScreenData | null, Error>({
    queryKey: ['homeScreenData'],
    queryFn: api.homeScreen.getData,
    enabled,
  });
};

export const useCalendarData = (date: Date) => {
  return useQuery<CalendarData, Error>({
    queryKey: ['calendarData', date.toISOString().split('T')[0]], // Use YYYY-MM-DD as key
    queryFn: () => api.calendar.getData(date),
    enabled: !!date, // Only run query if date is provided
  });
};