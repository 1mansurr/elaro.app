import React from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import {
  Course,
  Assignment,
  Lecture,
  StudySession,
  HomeScreenData,
  CalendarData,
} from '@/types';
import { cache } from '@/utils/cache';
import {
  CourseQueryOptions,
  CoursesPage,
} from '@/features/courses/services/queries';
import {
  AssignmentsPage,
  AssignmentQueryOptions,
} from '@/features/assignments/services/queries';
import {
  LecturesPage,
  LectureQueryOptions,
} from '@/features/lectures/services/queries';
import {
  StudySessionsPage,
  StudySessionQueryOptions,
} from '@/features/studySessions/services/queries';

// Enhanced courses hook with infinite scroll pagination, sorting, and filtering
export const useCourses = (options?: CourseQueryOptions) => {
  const {
    searchQuery,
    sortOption = 'name-asc',
    showArchived = false,
  } = options || {};
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
    getNextPageParam: lastPage => {
      // Return undefined if there are no more pages, otherwise return the next offset
      return lastPage.nextOffset;
    },
    initialPageParam: 0,
  });
};

// Enhanced assignments hook with infinite scroll pagination
export const useAssignments = (options?: AssignmentQueryOptions) => {
  const {
    pageParam = 0,
    pageSize = 50,
    sortBy = 'due_date',
    sortAscending = true,
  } = options || {};

  return useInfiniteQuery<AssignmentsPage, Error>({
    queryKey: ['assignments', sortBy, sortAscending],
    queryFn: async ({ pageParam = 0 }) => {
      const data = await api.assignments.listPage({
        pageParam: pageParam as number,
        pageSize,
        sortBy,
        sortAscending,
      });

      // Cache each page
      const cacheKey = `assignments:${sortBy}:${sortAscending}:page${pageParam}`;
      await cache.setMedium(cacheKey, data);

      return data;
    },
    getNextPageParam: lastPage => lastPage.nextOffset,
    initialPageParam: 0,
  });
};

// Enhanced lectures hook with infinite scroll pagination
export const useLectures = (options?: LectureQueryOptions) => {
  const {
    pageParam = 0,
    pageSize = 50,
    sortBy = 'start_time',
    sortAscending = true,
  } = options || {};

  return useInfiniteQuery<LecturesPage, Error>({
    queryKey: ['lectures', sortBy, sortAscending],
    queryFn: async ({ pageParam = 0 }) => {
      const data = await api.lectures.listPage({
        pageParam: pageParam as number,
        pageSize,
        sortBy,
        sortAscending,
      });

      // Cache each page
      const cacheKey = `lectures:${sortBy}:${sortAscending}:page${pageParam}`;
      await cache.setMedium(cacheKey, data);

      return data;
    },
    getNextPageParam: lastPage => lastPage.nextOffset,
    initialPageParam: 0,
  });
};

// Enhanced study sessions hook with infinite scroll pagination
export const useStudySessions = (options?: StudySessionQueryOptions) => {
  const {
    pageParam = 0,
    pageSize = 50,
    sortBy = 'session_date',
    sortAscending = true,
  } = options || {};

  return useInfiniteQuery<StudySessionsPage, Error>({
    queryKey: ['studySessions', sortBy, sortAscending],
    queryFn: async ({ pageParam = 0 }) => {
      const data = await api.studySessions.listPage({
        pageParam: pageParam as number,
        pageSize,
        sortBy,
        sortAscending,
      });

      // Cache each page
      const cacheKey = `studySessions:${sortBy}:${sortAscending}:page${pageParam}`;
      await cache.setMedium(cacheKey, data);

      return data;
    },
    getNextPageParam: lastPage => lastPage.nextOffset,
    initialPageParam: 0,
  });
};

// Enhanced home screen data hook with persistent caching
export const useHomeScreenData = (enabled: boolean = true) => {
  const cacheKey = 'homeScreenData';

  return useQuery<HomeScreenData | null, Error>({
    queryKey: ['homeScreenData'],
    queryFn: async () => {
      try {
        const data = await api.homeScreen.getData();
        // Cache for 5 minutes (changes more frequently)
        await cache.setShort(cacheKey, data);
        return data;
      } catch (error) {
        // On auth errors or edge function errors, return null instead of throwing
        // This provides better UX - user sees empty state instead of error screen
        const errorMessage =
          error instanceof Error && error.message
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Unknown error';

        if (
          error instanceof Error &&
          errorMessage &&
          (errorMessage.includes('No valid session') ||
            errorMessage.includes('Failed to refresh token') ||
            errorMessage.includes('Session expired') ||
            errorMessage.includes('Edge Function returned a non-2xx') ||
            errorMessage.includes('Authentication required') ||
            errorMessage.includes('Auth session missing'))
        ) {
          // Only log warnings in development to reduce production noise
          if (__DEV__) {
            console.warn(
              '⚠️ Auth/API error in homeScreenData, returning null:',
              errorMessage,
            );
          }
          return null;
        }
        // Re-throw other errors
        throw error;
      }
    },
    enabled,
    // Don't retry if disabled - prevents unnecessary API calls
    retry: enabled ? 3 : false,
  });
};

// Enhanced calendar data hook with persistent caching
export const useCalendarData = (
  date: Date,
  options?: { enabled?: boolean },
) => {
  const dateKey = date.toISOString().split('T')[0];
  const cacheKey = `calendarData:${dateKey}`;
  // Initialize with empty object for instant UI rendering
  const [placeholderData, setPlaceholderData] = React.useState<
    CalendarData | undefined
  >({});

  // Load cached data as placeholder on mount
  React.useEffect(() => {
    if (!date) return;

    const loadCachedData = async () => {
      try {
        const cached = await cache.get<CalendarData>(cacheKey);
        if (cached) {
          setPlaceholderData(cached);
        }
      } catch (error) {
        // Ignore cache errors - keep empty object for instant rendering
      }
    };

    loadCachedData();
  }, [dateKey, cacheKey]);

  return useQuery<CalendarData, Error>({
    queryKey: ['calendarData', dateKey],
    queryFn: async () => {
      try {
        const data = await api.calendar.getData(date);
        // Cache for 1 hour (calendar data for a specific day)
        await cache.setMedium(cacheKey, data);
        return data;
      } catch (error) {
        // On auth errors or edge function errors, return empty object instead of throwing
        // This provides better UX - user sees empty state instead of error screen
        const errorMessage =
          error instanceof Error && error.message
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Unknown error';

        if (
          error instanceof Error &&
          errorMessage &&
          (errorMessage.includes('No valid session') ||
            errorMessage.includes('Failed to refresh token') ||
            errorMessage.includes('Session expired') ||
            errorMessage.includes('Edge Function returned a non-2xx') ||
            errorMessage.includes('Authentication required') ||
            errorMessage.includes('Auth session missing'))
        ) {
          // Only log warnings in development to reduce production noise
          if (__DEV__) {
            console.warn(
              '⚠️ Auth/API error in calendarData, returning empty object:',
              errorMessage,
            );
          }
          return {};
        }
        // Re-throw other errors
        throw error;
      }
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!date,
    placeholderData, // Show cached data immediately while fetching fresh data
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });
};

// Enhanced calendar month data hook with persistent caching
export const useCalendarMonthData = (
  year: number,
  month: number,
  options?: { enabled?: boolean },
) => {
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const cacheKey = `calendarMonthData:${monthKey}`;
  // Initialize with empty object for instant UI rendering
  const [placeholderData, setPlaceholderData] = React.useState<
    CalendarData | undefined
  >({});

  // Load cached data as placeholder on mount
  React.useEffect(() => {
    if (year === undefined || month === undefined) return;

    const loadCachedData = async () => {
      try {
        const cached = await cache.get<CalendarData>(cacheKey);
        if (cached) {
          setPlaceholderData(cached);
        }
      } catch (error) {
        // Ignore cache errors - keep empty object for instant rendering
      }
    };

    loadCachedData();
  }, [monthKey, cacheKey, year, month]);

  return useQuery<CalendarData, Error>({
    queryKey: ['calendarMonthData', monthKey],
    queryFn: async () => {
      try {
        const data = await api.calendar.getMonthData(year, month);
        // Cache for 1 hour (calendar data for a specific month)
        await cache.setMedium(cacheKey, data);
        return data;
      } catch (error) {
        // On auth errors or edge function errors, return empty object instead of throwing
        // This provides better UX - user sees empty state instead of error screen
        const errorMessage =
          error instanceof Error && error.message
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Unknown error';

        if (
          error instanceof Error &&
          errorMessage &&
          (errorMessage.includes('No valid session') ||
            errorMessage.includes('Failed to refresh token') ||
            errorMessage.includes('Session expired') ||
            errorMessage.includes('Edge Function returned a non-2xx') ||
            errorMessage.includes('Authentication required') ||
            errorMessage.includes('Auth session missing'))
        ) {
          // Only log warnings in development to reduce production noise
          if (__DEV__) {
            console.warn(
              '⚠️ Auth/API error in calendarMonthData, returning empty object:',
              errorMessage,
            );
          }
          return {};
        }
        // Re-throw other errors
        throw error;
      }
    },
    enabled:
      options?.enabled !== undefined
        ? options.enabled
        : year !== undefined && month !== undefined,
    placeholderData, // Show cached data immediately while fetching fresh data
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });
};
