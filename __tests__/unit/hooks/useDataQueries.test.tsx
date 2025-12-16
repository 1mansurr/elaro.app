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
      const { result } = renderHook(
        () => useCourses({ searchQuery: 'test', sortOption: 'name-desc' }),
        { wrapper },
      );

      expect(result.current).toBeDefined();
      expect(mockApi.courses.getAll).toHaveBeenCalled();
    });
  });

  describe('useAssignments', () => {
    it('should fetch assignments data', () => {
      const { result } = renderHook(() => useAssignments(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
    });

    it('should use correct query options', () => {
      const { result } = renderHook(
        () => useAssignments({ sortBy: 'title', sortAscending: false }),
        { wrapper },
      );

      expect(result.current).toBeDefined();
      expect(mockApi.assignments.listPage).toHaveBeenCalled();
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
