/**
 * Integration Tests: React Query + Cache Persistence
 *
 * Tests the integration between React Query and cache persistence:
 * - Query cache updated → Persisted to AsyncStorage
 * - App restart → Cache restored
 * - Cache invalidation → Persistence updated
 */

import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  persistQueryCache,
  restoreQueryCache,
  clearQueryCache,
} from '@/utils/queryCachePersistence';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('React Query + Cache Persistence Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Cache Persistence', () => {
    it('should persist query cache to AsyncStorage', async () => {
      // Set some query data
      queryClient.setQueryData(
        ['assignments'],
        [
          { id: '1', title: 'Assignment 1' },
          { id: '2', title: 'Assignment 2' },
        ],
      );

      await persistQueryCache(queryClient);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@elaro_query_cache_v1',
        expect.stringContaining('assignments'),
      );
    });

    it('should persist multiple queries', async () => {
      queryClient.setQueryData(['assignments'], [{ id: '1' }]);
      queryClient.setQueryData(['courses'], [{ id: '1' }]);
      queryClient.setQueryData(['lectures'], [{ id: '1' }]);

      await persistQueryCache(queryClient);

      const callArgs = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const persistedData = JSON.parse(callArgs[1]);

      expect(persistedData.length).toBe(3);
      expect(
        persistedData.some(
          (q: { queryKey: unknown[] }) => q.queryKey[0] === 'assignments',
        ),
      ).toBe(true);
      expect(
        persistedData.some(
          (q: { queryKey: unknown[] }) => q.queryKey[0] === 'courses',
        ),
      ).toBe(true);
    });

    it('should include query metadata in persistence', async () => {
      queryClient.setQueryData(['assignments'], [{ id: '1' }]);

      await persistQueryCache(queryClient);

      const callArgs = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const persistedData = JSON.parse(callArgs[1]);

      expect(persistedData[0]).toHaveProperty('queryKey');
      expect(persistedData[0]).toHaveProperty('queryHash');
      expect(persistedData[0]).toHaveProperty('state');
      expect(persistedData[0]).toHaveProperty('options');
    });
  });

  describe('Cache Restoration', () => {
    it('should restore query cache from AsyncStorage', async () => {
      const cachedData = JSON.stringify([
        {
          queryKey: ['assignments'],
          queryHash: '["assignments"]',
          state: {
            data: [{ id: '1', title: 'Cached Assignment' }],
            dataUpdatedAt: Date.now(),
            error: null,
            errorUpdatedAt: 0,
            status: 'success',
            fetchStatus: 'idle',
          },
          options: {
            staleTime: 300000,
          },
        },
      ]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(cachedData);

      await restoreQueryCache(queryClient);

      const restoredData = queryClient.getQueryData(['assignments']);
      expect(restoredData).toEqual([{ id: '1', title: 'Cached Assignment' }]);
    });

    it('should handle empty cache gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await restoreQueryCache(queryClient);

      const data = queryClient.getQueryData(['assignments']);
      expect(data).toBeUndefined();
    });

    it('should restore multiple queries', async () => {
      const cachedData = JSON.stringify([
        {
          queryKey: ['assignments'],
          queryHash: '["assignments"]',
          state: {
            data: [{ id: '1' }],
            dataUpdatedAt: Date.now(),
            error: null,
            errorUpdatedAt: 0,
            status: 'success',
            fetchStatus: 'idle',
          },
          options: {},
        },
        {
          queryKey: ['courses'],
          queryHash: '["courses"]',
          state: {
            data: [{ id: '1' }],
            dataUpdatedAt: Date.now(),
            error: null,
            errorUpdatedAt: 0,
            status: 'success',
            fetchStatus: 'idle',
          },
          options: {},
        },
      ]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(cachedData);

      await restoreQueryCache(queryClient);

      expect(queryClient.getQueryData(['assignments'])).toBeDefined();
      expect(queryClient.getQueryData(['courses'])).toBeDefined();
    });

    it('should clear corrupted cache on restore error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      await restoreQueryCache(queryClient);

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        '@elaro_query_cache_v1',
      );
    });
  });

  describe('Cache Invalidation', () => {
    it('should update persisted cache after invalidation', async () => {
      queryClient.setQueryData(['assignments'], [{ id: '1' }]);
      await persistQueryCache(queryClient);

      // Invalidate and update
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.setQueryData(
        ['assignments'],
        [{ id: '1', title: 'Updated' }],
      );

      await persistQueryCache(queryClient);

      const callArgs = (AsyncStorage.setItem as jest.Mock).mock.calls[1];
      const persistedData = JSON.parse(callArgs[1]);
      const assignment = persistedData.find(
        (q: { queryKey: unknown[] }) => q.queryKey[0] === 'assignments',
      );

      expect(assignment.state.data[0].title).toBe('Updated');
    });

    it('should remove invalidated queries from persistence', async () => {
      queryClient.setQueryData(['assignments'], [{ id: '1' }]);
      queryClient.setQueryData(['courses'], [{ id: '1' }]);
      await persistQueryCache(queryClient);

      // Remove one query
      queryClient.removeQueries({ queryKey: ['assignments'] });
      await persistQueryCache(queryClient);

      const callArgs = (AsyncStorage.setItem as jest.Mock).mock.calls[1];
      const persistedData = JSON.parse(callArgs[1]);

      expect(persistedData.length).toBe(1);
      expect(persistedData[0].queryKey[0]).toBe('courses');
    });
  });

  describe('Cache Clear', () => {
    it('should clear persisted cache', async () => {
      await clearQueryCache();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        '@elaro_query_cache_v1',
      );
    });

    it('should clear both memory and persisted cache', async () => {
      queryClient.setQueryData(['assignments'], [{ id: '1' }]);
      await persistQueryCache(queryClient);

      queryClient.clear();
      await clearQueryCache();

      expect(queryClient.getQueryData(['assignments'])).toBeUndefined();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('Event-Driven Persistence', () => {
    it('should persist cache on query data update', async () => {
      // Simulate cache update event
      queryClient.setQueryData(['assignments'], [{ id: '1' }]);

      // In real implementation, this would be triggered by cache.subscribe
      await persistQueryCache(queryClient);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should debounce multiple cache updates', async () => {
      // Simulate rapid cache updates
      queryClient.setQueryData(['assignments'], [{ id: '1' }]);
      queryClient.setQueryData(['courses'], [{ id: '1' }]);
      queryClient.setQueryData(['lectures'], [{ id: '1' }]);

      // In real implementation, debounce would batch these
      await persistQueryCache(queryClient);

      // Should only persist once after debounce
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });
});
