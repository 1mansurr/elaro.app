import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Course, Assignment, Lecture, StudySession, HomeScreenData, CalendarData } from '@/types';

export const useCourses = () => {
  return useQuery<Course[], Error>({
    queryKey: ['courses'],
    queryFn: api.courses.getAll,
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

export const useHomeScreenData = () => {
  return useQuery<HomeScreenData | null, Error>({
    queryKey: ['homeScreenData'],
    queryFn: api.homeScreen.getData,
  });
};

export const useCalendarData = (date: Date) => {
  return useQuery<CalendarData, Error>({
    queryKey: ['calendarData', date.toISOString().split('T')[0]], // Use YYYY-MM-DD as key
    queryFn: () => api.calendar.getData(date),
    enabled: !!date, // Only run query if date is provided
  });
};