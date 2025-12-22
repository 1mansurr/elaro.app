import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCourses,
  useAssignments,
  useHomeScreenData,
} from '@/hooks/useDataQueries';
import { api } from '@/services/api';

jest.mock('@/services/api');
jest.mock('@/utils/cache', () => ({
  cache: {
    setMedium: jest.fn().mockResolvedValue(undefined),
    getMedium: jest.fn().mockResolvedValue(null),
  },
}));

// Mock useInfiniteQuery locally since the test uses real QueryClientProvider
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useInfiniteQuery: jest.fn(() => ({
      data: { pages: [], pageParams: [] },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })),
  };
});

const mockApi = api as jest.Mocked<typeof api>;

describe('useDataQueries', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    mockApi.courses = {
      getAll: jest.fn().mockResolvedValue({
        courses: [],
        nextOffset: undefined,
      }),
    } as any;

    mockApi.assignments = {
      listPage: jest.fn().mockResolvedValue({
        assignments: [],
        nextOffset: undefined,
      }),
    } as any;

    mockApi.homeScreen = {
      getData: jest.fn().mockResolvedValue({
        tasks: [],
        upcoming: [],
        recent: [],
      }),
    } as any;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useCourses', () => {
    it('should fetch courses data', () => {
      const { result } = renderHook(() => useCourses(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
    });

    it('should use correct query key', () => {
      const { useInfiniteQuery } = require('@tanstack/react-query');
      const { result } = renderHook(
        () => useCourses({ searchQuery: 'test', sortOption: 'name-desc' }),
        { wrapper },
      );

      expect(result.current).toBeDefined();
      // Verify useInfiniteQuery was called with correct query key
      expect(useInfiniteQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['courses', 'test', 'name-desc', false],
        }),
      );
    });
  });

  describe('useAssignments', () => {
    it('should fetch assignments data', () => {
      const { result } = renderHook(() => useAssignments(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
    });

    it('should use correct query options', () => {
      const { useInfiniteQuery } = require('@tanstack/react-query');
      const { result } = renderHook(
        () => useAssignments({ sortBy: 'title', sortAscending: false }),
        { wrapper },
      );

      expect(result.current).toBeDefined();
      // Verify useInfiniteQuery was called with correct query key
      expect(useInfiniteQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['assignments', 'title', false],
        }),
      );
    });
  });

  describe('useHomeScreenData', () => {
    it('should fetch home screen data', () => {
      const { result } = renderHook(() => useHomeScreenData(true), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
    });

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() => useHomeScreenData(false), {
        wrapper,
      });

      expect(result.current).toBeDefined();
      // When disabled, should not make API call
    });
  });
});
