import { syncManager } from '@/services/syncManager';
import {
  OfflineAction,
  OfflineOperationType,
  OfflineResourceType,
} from '@/types/offline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/services/supabase';
import { CircuitBreaker } from '@/utils/circuitBreaker';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('@/services/supabase');
jest.mock('@/utils/circuitBreaker');
jest.mock('@/utils/invokeEdgeFunction', () => ({
  invokeEdgeFunctionWithAuth: jest.fn(),
}));
jest.mock('@/utils/cache', () => ({
  cache: {
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockCircuitBreaker = CircuitBreaker as any;

describe('SyncManager', () => {
  // Store for AsyncStorage mock
  const asyncStorageStore: Record<string, string> = {};

  beforeEach(async () => {
    // Wait a bit to ensure any ongoing processing completes first
    await new Promise(resolve => setTimeout(resolve, 50));

    await syncManager.clearQueue();
    jest.clearAllMocks();

    // Clear AsyncStorage store
    Object.keys(asyncStorageStore).forEach(
      key => delete asyncStorageStore[key],
    );

    // Mock AsyncStorage with persistent storage
    mockAsyncStorage.getItem = jest.fn((key: string) => {
      return Promise.resolve(asyncStorageStore[key] || null);
    });
    mockAsyncStorage.setItem = jest.fn((key: string, value: string) => {
      asyncStorageStore[key] = value;
      return Promise.resolve(undefined);
    });
    mockAsyncStorage.removeItem = jest.fn((key: string) => {
      delete asyncStorageStore[key];
      return Promise.resolve(undefined);
    });

    // Mock NetInfo
    mockNetInfo.fetch = jest.fn().mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    } as any);

    // Mock NetInfo.addEventListener to return unsubscribe function
    mockNetInfo.addEventListener = jest.fn(
      (_listener: (state: any) => void) => jest.fn(),
    ) as any;

    // Mock Circuit Breaker - default instance
    const defaultMockCircuitBreakerInstance = {
      execute: jest.fn(async fn => await fn()),
      getState: jest.fn().mockReturnValue('closed'),
      getStats: jest
        .fn()
        .mockReturnValue({ failures: 0, successes: 0, state: 'closed' }),
      reset: jest.fn(),
    };

    mockCircuitBreaker.getInstance = jest
      .fn()
      .mockReturnValue(defaultMockCircuitBreakerInstance as any);
  });

  afterAll(async () => {
    await syncManager.stop();
  });

  describe('Queue Management', () => {
    it('should add action to queue', async () => {
      const action = await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test Assignment' } },
        'user-1',
      );

      expect(action).toBeDefined();
      expect(action.status).toBe('pending');

      const queue = syncManager.getQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].id).toBe(action.id);
    });

    it('should persist queue to AsyncStorage', async () => {
      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
      );

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should load queue from AsyncStorage on start', async () => {
      const mockQueue = [
        {
          id: 'action-1',
          operation: 'CREATE' as OfflineOperationType,
          resourceType: 'assignment' as OfflineResourceType,
          payload: { type: 'CREATE' as const, data: { title: 'Test' } },
          userId: 'user-1',
          status: 'pending' as const,
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      mockAsyncStorage.getItem = jest
        .fn()
        .mockResolvedValue(JSON.stringify(mockQueue));

      await syncManager.start();

      const queue = syncManager.getQueue();
      expect(queue.length).toBe(1);
    });
  });

  describe('Queue Processing', () => {
    it('should process pending actions when online', async () => {
      (mockNetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      } as any);

      const {
        invokeEdgeFunctionWithAuth,
      } = require('@/utils/invokeEdgeFunction');
      (invokeEdgeFunctionWithAuth as jest.Mock).mockResolvedValue({
        data: { id: 'created-1' },
        error: null,
      });

      // Reset circuit breaker mock for this test
      const mockExecute = jest.fn(async fn => await fn());
      const mockCircuitBreakerInstance = {
        execute: mockExecute,
        getState: jest.fn().mockReturnValue('closed'),
        getStats: jest.fn(),
        reset: jest.fn(),
      };
      mockCircuitBreaker.getInstance = jest
        .fn()
        .mockReturnValue(mockCircuitBreakerInstance as any);

      // Ensure processing is not in progress
      await new Promise(resolve => setTimeout(resolve, 50));

      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
        { syncImmediately: false }, // Disable immediate sync to test processQueue directly
      );

      // Wait a bit to ensure addToQueue completes
      await new Promise(resolve => setTimeout(resolve, 10));

      const results = await syncManager.processQueue();

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(invokeEdgeFunctionWithAuth).toHaveBeenCalledWith(
        'create-assignment',
        expect.objectContaining({
          body: expect.objectContaining({ title: 'Test' }),
        }),
      );
    });

    it('should not process queue when offline', async () => {
      (mockNetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);

      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
        { syncImmediately: false }, // Disable immediate sync
      );

      const results = await syncManager.processQueue();

      expect(results.length).toBe(0);
      const {
        invokeEdgeFunctionWithAuth,
      } = require('@/utils/invokeEdgeFunction');
      expect(invokeEdgeFunctionWithAuth).not.toHaveBeenCalled();
    });

    it('should retry failed actions with exponential backoff', async () => {
      const {
        invokeEdgeFunctionWithAuth,
      } = require('@/utils/invokeEdgeFunction');
      (invokeEdgeFunctionWithAuth as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { id: 'created-1' }, error: null });

      // Reset circuit breaker mock for this test
      const mockExecute = jest.fn(async fn => {
        try {
          return await fn();
        } catch (error) {
          throw error;
        }
      });
      const mockCircuitBreakerInstance = {
        execute: mockExecute,
        getState: jest.fn().mockReturnValue('closed'),
        getStats: jest.fn(),
        reset: jest.fn(),
      };
      mockCircuitBreaker.getInstance = jest
        .fn()
        .mockReturnValue(mockCircuitBreakerInstance as any);

      const action = await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
        { syncImmediately: false }, // Disable immediate sync
      );

      // First attempt fails
      await syncManager.processQueue();

      // Verify retry delay is set
      const queue = syncManager.getQueue();
      const queuedAction = queue.find((a: any) => a.id === action.id);
      expect(queuedAction).toBeDefined();
      expect((queuedAction as any).nextRetryAt).toBeDefined();
      expect((queuedAction as any).nextRetryAt).toBeGreaterThan(Date.now());
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should use circuit breaker for server mutations', async () => {
      const mockExecute = jest.fn().mockResolvedValue({ id: 'created-1' });
      const mockCircuitBreakerInstance = {
        execute: mockExecute,
        getState: jest.fn().mockReturnValue('closed'),
        getStats: jest.fn(),
        reset: jest.fn(),
      };

      mockCircuitBreaker.getInstance = jest
        .fn()
        .mockReturnValue(mockCircuitBreakerInstance as any);

      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
        { syncImmediately: false }, // Disable immediate sync
      );

      await syncManager.processQueue();

      expect(mockExecute).toHaveBeenCalled();
    });

    it('should handle circuit breaker open state', async () => {
      const mockExecute = jest
        .fn()
        .mockRejectedValue(
          new Error('Circuit breaker is open for sync-manager'),
        );
      const mockCircuitBreakerInstance = {
        execute: mockExecute,
        getState: jest.fn().mockReturnValue('open'),
        getStats: jest.fn(),
        reset: jest.fn(),
      };

      mockCircuitBreaker.getInstance = jest
        .fn()
        .mockReturnValue(mockCircuitBreakerInstance as any);

      const action = await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
        { syncImmediately: false }, // Disable immediate sync
      );

      await syncManager.processQueue();

      // Verify action is still pending (not retried)
      const queue = syncManager.getQueue();
      const queuedAction = queue.find((a: any) => a.id === action.id);
      expect(queuedAction?.status).toBe('pending');
      expect(queuedAction?.retryCount).toBe(0); // Should not increment for circuit breaker errors
    });
  });

  describe('Queue Statistics', () => {
    it('should return accurate queue statistics', async () => {
      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: {} },
        'user-1',
        { syncImmediately: false }, // Disable immediate sync
      );
      await syncManager.addToQueue(
        'UPDATE',
        'assignment',
        { type: 'UPDATE', resourceId: 'id-1', updates: {} },
        'user-1',
        { syncImmediately: false }, // Disable immediate sync
      );

      const stats = syncManager.getQueueStats();

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const {
        invokeEdgeFunctionWithAuth,
      } = require('@/utils/invokeEdgeFunction');
      (invokeEdgeFunctionWithAuth as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      // Reset circuit breaker mock for this test
      const mockExecute = jest.fn(async fn => {
        try {
          return await fn();
        } catch (error) {
          throw error;
        }
      });
      const mockCircuitBreakerInstance = {
        execute: mockExecute,
        getState: jest.fn().mockReturnValue('closed'),
        getStats: jest.fn(),
        reset: jest.fn(),
      };
      mockCircuitBreaker.getInstance = jest
        .fn()
        .mockReturnValue(mockCircuitBreakerInstance as any);

      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
        { syncImmediately: false }, // Disable immediate sync
      );

      const results = await syncManager.processQueue();

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
    });
  });
});
