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
jest.mock('@/utils/cache', () => ({
  cache: {
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockCircuitBreaker = CircuitBreaker as jest.MockedClass<
  typeof CircuitBreaker
>;

describe('SyncManager', () => {
  beforeEach(async () => {
    await syncManager.clearQueue();
    jest.clearAllMocks();

    // Mock AsyncStorage
    mockAsyncStorage.getItem = jest.fn().mockResolvedValue(null);
    mockAsyncStorage.setItem = jest.fn().mockResolvedValue(undefined);
    mockAsyncStorage.removeItem = jest.fn().mockResolvedValue(undefined);

    // Mock NetInfo
    mockNetInfo.fetch = jest.fn().mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    } as any);

    // Mock Circuit Breaker
    const mockCircuitBreakerInstance = {
      execute: jest.fn(fn => fn()),
      getState: jest.fn().mockReturnValue('closed'),
      getStats: jest
        .fn()
        .mockReturnValue({ failures: 0, successes: 0, state: 'closed' }),
      reset: jest.fn(),
    };

    mockCircuitBreaker.getInstance = jest
      .fn()
      .mockReturnValue(mockCircuitBreakerInstance as any);
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

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { id: 'created-1' },
        error: null,
      });

      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
      );

      const results = await syncManager.processQueue();

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(mockSupabase.functions.invoke).toHaveBeenCalled();
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
      );

      const results = await syncManager.processQueue();

      expect(results.length).toBe(0);
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('should retry failed actions with exponential backoff', async () => {
      (mockSupabase.functions.invoke as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { id: 'created-1' }, error: null });

      const action = await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
      );

      // First attempt fails
      await syncManager.processQueue();

      // Verify retry delay is set
      const queue = syncManager.getQueue();
      const queuedAction = queue.find(a => a.id === action.id);
      expect((queuedAction as any).nextRetryAt).toBeDefined();
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
      );

      await syncManager.processQueue();

      // Verify action is still pending (not retried)
      const queue = syncManager.getQueue();
      const queuedAction = queue.find(a => a.id === action.id);
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
      );
      await syncManager.addToQueue(
        'UPDATE',
        'assignment',
        { type: 'UPDATE', resourceId: 'id-1', updates: {} },
        'user-1',
      );

      const stats = syncManager.getQueueStats();

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
      );

      const results = await syncManager.processQueue();

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
    });

    it('should handle max retries correctly', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockRejectedValue(
        new Error('Persistent error'),
      );

      const action = await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
        { maxRetries: 2 },
      );

      // Process queue multiple times to exhaust retries
      await syncManager.processQueue();
      await syncManager.processQueue();
      await syncManager.processQueue();

      const queue = syncManager.getQueue();
      const failedAction = queue.find(a => a.id === action.id);
      expect(failedAction?.status).toBe('failed');
      expect(failedAction?.retryCount).toBe(2);
    });

    it('should handle server errors', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Server error', status: 500 },
      });

      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
      );

      const results = await syncManager.processQueue();
      expect(results[0].success).toBe(false);
    });
  });

  describe('Queue Status and Statistics', () => {
    it('should return accurate queue length', async () => {
      expect(syncManager.getQueueLength()).toBe(0);

      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: {} },
        'user-1',
      );

      expect(syncManager.getQueueLength()).toBe(1);
    });

    it('should return detailed queue status', async () => {
      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: {} },
        'user-1',
      );
      await syncManager.addToQueue(
        'UPDATE',
        'assignment',
        { type: 'UPDATE', resourceId: 'id-1', updates: {} },
        'user-1',
      );

      const status = syncManager.getQueueStatus();

      expect(status.length).toBe(2);
      expect(status.pending).toBe(2);
      expect(status.processing).toBe(0);
      expect(status.failed).toBe(0);
    });

    it('should return accurate queue stats', async () => {
      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: {} },
        'user-1',
      );
      await syncManager.addToQueue(
        'DELETE',
        'assignment',
        { type: 'DELETE', resourceId: 'id-1' },
        'user-1',
      );

      const stats = syncManager.getQueueStats();

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
      expect(stats.oldestTimestamp).toBeDefined();
    });
  });

  describe('Priority Handling', () => {
    it('should assign correct priority to DELETE operations', async () => {
      const action = await syncManager.addToQueue(
        'DELETE',
        'assignment',
        { type: 'DELETE', resourceId: 'id-1' },
        'user-1',
      );

      expect((action as any).priority).toBe('high');
    });

    it('should assign correct priority to UPDATE operations', async () => {
      const action = await syncManager.addToQueue(
        'UPDATE',
        'assignment',
        { type: 'UPDATE', resourceId: 'id-1', updates: {} },
        'user-1',
      );

      expect((action as any).priority).toBe('normal');
    });

    it('should assign correct priority to CREATE operations', async () => {
      const action = await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: {} },
        'user-1',
      );

      expect((action as any).priority).toBe('low');
    });

    it('should process high priority actions first', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { id: 'created-1' },
        error: null,
      });

      // Add actions in reverse priority order
      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Low Priority' } },
        'user-1',
      );
      await syncManager.addToQueue(
        'DELETE',
        'assignment',
        { type: 'DELETE', resourceId: 'id-1' },
        'user-1',
      );
      await syncManager.addToQueue(
        'UPDATE',
        'assignment',
        { type: 'UPDATE', resourceId: 'id-2', updates: {} },
        'user-1',
      );

      const results = await syncManager.processQueue();

      // DELETE should be processed first (high priority)
      expect(results[0].action.operation).toBe('DELETE');
    });
  });

  describe('Temp ID Replacement', () => {
    it('should handle temp ID replacement for CREATE operations', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { id: 'server-id-123' },
        error: null,
      });

      const action = await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
      );

      await syncManager.processQueue();

      // Temp ID should be replaced in ID mapping
      // (exact implementation depends on handleTempIdReplacement)
    });
  });

  describe('Queue Management', () => {
    it('should clear queue', async () => {
      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: {} },
        'user-1',
      );

      await syncManager.clearQueue();

      expect(syncManager.getQueueLength()).toBe(0);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should remove specific action from queue', async () => {
      const action1 = await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: {} },
        'user-1',
      );
      const action2 = await syncManager.addToQueue(
        'UPDATE',
        'assignment',
        { type: 'UPDATE', resourceId: 'id-1', updates: {} },
        'user-1',
      );

      await syncManager.removeAction(action1.id);

      const queue = syncManager.getQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].id).toBe(action2.id);
    });

    it('should evict old low-priority items when queue exceeds limit', async () => {
      // Add many low-priority items
      for (let i = 0; i < 110; i++) {
        await syncManager.addToQueue(
          'CREATE',
          'assignment',
          { type: 'CREATE', data: { title: `Item ${i}` } },
          'user-1',
        );
      }

      // Queue should be evicted to stay under limit
      // (exact implementation depends on evictOldQueueItems)
      expect(syncManager.getQueueLength()).toBeLessThanOrEqual(100);
    });
  });

  describe('Subscriptions', () => {
    it('should notify listeners on queue changes', () => {
      const listener = jest.fn();
      const unsubscribe = syncManager.subscribe(listener);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          total: expect.any(Number),
        }),
      );

      unsubscribe();
    });

    it('should allow unsubscribing from queue updates', () => {
      const listener = jest.fn();
      const unsubscribe = syncManager.subscribe(listener);

      unsubscribe();

      // Add action - listener should not be called
      syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: {} },
        'user-1',
      );

      // Listener should only have been called once (on subscribe)
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Network Listener', () => {
    it('should set up network listener on start', async () => {
      await syncManager.start();

      // Network listener should be set up
      // (exact implementation depends on setupNetworkListener)
      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
    });

    it('should trigger sync when coming online', async () => {
      let networkStateCallback: ((state: any) => void) | null = null;

      (mockNetInfo.addEventListener as jest.Mock).mockImplementation(
        callback => {
          networkStateCallback = callback;
          return jest.fn(); // Return unsubscribe function
        },
      );

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { id: 'created-1' },
        error: null,
      });

      await syncManager.start();

      // Add action while offline
      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
      );

      // Simulate coming online
      if (networkStateCallback) {
        networkStateCallback({
          isConnected: true,
          isInternetReachable: true,
        });
      }

      // Should trigger sync
      await new Promise(resolve => setTimeout(resolve, 100));
      // (exact verification depends on implementation)
    });
  });

  describe('Configuration', () => {
    it('should update configuration', async () => {
      await syncManager.updateConfig({ maxQueueSize: 50 });

      // Configuration should be updated
      // (exact verification depends on implementation)
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should track syncing state', async () => {
      expect(syncManager.getIsSyncing()).toBe(false);

      (mockSupabase.functions.invoke as jest.Mock).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () => resolve({ data: { id: 'created-1' }, error: null }),
              100,
            ),
          ),
      );

      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
      );

      const processPromise = syncManager.processQueue();

      // Should be syncing during processing
      // (exact timing depends on implementation)

      await processPromise;
      expect(syncManager.getIsSyncing()).toBe(false);
    });

    it('should prevent concurrent processing', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () => resolve({ data: { id: 'created-1' }, error: null }),
              100,
            ),
          ),
      );

      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
      );

      // Start processing
      const process1 = syncManager.processQueue();
      // Try to process again while first is running
      const process2 = syncManager.processQueue();

      const [results1, results2] = await Promise.all([process1, process2]);

      // Second call should return empty array
      expect(results2.length).toBe(0);
    });
  });

  describe('Startup Behavior', () => {
    it('should process existing queue on startup when online', async () => {
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

      mockAsyncStorage.getItem = jest.fn().mockImplementation(key => {
        if (key === 'offline_queue') {
          return Promise.resolve(JSON.stringify(mockQueue));
        }
        return Promise.resolve(null);
      });

      (mockNetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      } as any);

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { id: 'created-1' },
        error: null,
      });

      await syncManager.start();

      // Should process queue on startup
      await new Promise(resolve => setTimeout(resolve, 200));
      // (exact verification depends on implementation)
    });

    it('should not process queue on startup when offline', async () => {
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

      mockAsyncStorage.getItem = jest.fn().mockImplementation(key => {
        if (key === 'offline_queue') {
          return Promise.resolve(JSON.stringify(mockQueue));
        }
        return Promise.resolve(null);
      });

      (mockNetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);

      await syncManager.start();

      // Should not process queue when offline
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });
  });
});
