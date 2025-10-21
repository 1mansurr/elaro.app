import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Course, Assignment, Lecture, StudySession, HomeScreenData, CalendarData } from '@/types';
import { cache } from '@/utils/cache';
import { CourseQueryOptions, CoursesPage } from '@/features/courses/services/queries';

// Enhanced courses hook with infinite scroll pagination, sorting, and filtering
export const useCourses = (options?: CourseQueryOptions) => {
  const { searchQuery, sortOption = 'name-asc', showArchived = false } = options || {};
  const pageSize = 20;
  
  return useInfiniteQuery<CoursesPage, Error>({
    queryKey: ['courses', searchQuery || '', sortOption, showArchived],
    queryFn: async ({ pageParam = 0 }) => {
      const data = await api.courses.getAll({
        ...options,
        pageParam: pageParam as number,
        pageSize,
      });
      
      // Cache each page
      const cacheKey = `courses:${searchQuery || 'all'}:${sortOption}:${showArchived}:page${pageParam}`;
      await cache.setMedium(cacheKey, data);
      
      return data;
    },
    getNextPageParam: (lastPage) => {
      // Return undefined if there are no more pages, otherwise return the next offset
      return lastPage.nextOffset;
    },
    initialPageParam: 0,
  });
};

// Enhanced assignments hook with persistent caching
export const useAssignments = () => {
  const cacheKey = 'assignments';
  
  return useQuery<Assignment[], Error>({
    queryKey: ['assignments'],
    queryFn: async () => {
      const data = await api.assignments.getAll();
      await cache.setMedium(cacheKey, data);
      return data;
    },
  });
};

// Enhanced lectures hook with persistent caching
export const useLectures = () => {
  const cacheKey = 'lectures';
  
  return useQuery<Lecture[], Error>({
    queryKey: ['lectures'],
    queryFn: async () => {
      const data = await api.lectures.getAll();
      await cache.setMedium(cacheKey, data);
      return data;
    },
  });
};

// Enhanced study sessions hook with persistent caching
export const useStudySessions = () => {
  const cacheKey = 'studySessions';
  
  return useQuery<StudySession[], Error>({
    queryKey: ['studySessions'],
    queryFn: async () => {
      const data = await api.studySessions.getAll();
      await cache.setMedium(cacheKey, data);
      return data;
    },
  });
};

// Enhanced home screen data hook with persistent caching
export const useHomeScreenData = (enabled: boolean = true) => {
  const cacheKey = 'homeScreenData';
  
  return useQuery<HomeScreenData | null, Error>({
    queryKey: ['homeScreenData'],
    queryFn: async () => {
      const data = await api.homeScreen.getData();
      // Cache for 5 minutes (changes more frequently)
      await cache.setShort(cacheKey, data);
      return data;
    },
    enabled,
  });
};

// Enhanced calendar data hook with persistent caching
export const useCalendarData = (date: Date) => {
  const dateKey = date.toISOString().split('T')[0];
  const cacheKey = `calendarData:${dateKey}`;
  
  return useQuery<CalendarData, Error>({
    queryKey: ['calendarData', dateKey],
    queryFn: async () => {
      const data = await api.calendar.getData(date);
      // Cache for 1 hour (calendar data for a specific day)
      await cache.setMedium(cacheKey, data);
      return data;
    },
    enabled: !!date,
  });
};

// Enhanced calendar month data hook with persistent caching
export const useCalendarMonthData = (year: number, month: number) => {
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const cacheKey = `calendarMonthData:${monthKey}`;
  
  return useQuery<CalendarData, Error>({
    queryKey: ['calendarMonthData', monthKey],
    queryFn: async () => {
      const data = await api.calendar.getMonthData(year, month);
      // Cache for 1 hour (calendar data for a specific month)
      await cache.setMedium(cacheKey, data);
      return data;
    },
    enabled: year !== undefined && month !== undefined,
  });
};