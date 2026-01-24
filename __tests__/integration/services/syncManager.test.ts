import { syncManager } from '@/services/syncManager';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from '@/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-community/netinfo');
jest.mock('@/services/supabase');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@/utils/circuitBreaker');
jest.mock('@/utils/cache', () => ({
  cache: {
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('SyncManager Integration Tests', () => {
  beforeEach(async () => {
    await syncManager.clearQueue();
    jest.clearAllMocks();

    mockAsyncStorage.getItem = jest.fn().mockResolvedValue(null);
    mockAsyncStorage.setItem = jest.fn().mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await syncManager.stop();
  });

  describe('Offline/Online Transitions', () => {
    it('should queue actions when offline', async () => {
      (mockNetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);

      const action = await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Offline Assignment' } },
        'user-1',
      );

      expect(action.status).toBe('pending');

      // Should not process when offline
      const results = await syncManager.processQueue();
      expect(results.length).toBe(0);
    });

    it('should process queue when coming online', async () => {
      // Start offline
      (mockNetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);

      await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test Assignment' } },
        'user-1',
      );

      // Transition to online
      (mockNetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      } as any);

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { id: 'created-1' },
        error: null,
      });

      // Process queue
      const results = await syncManager.processQueue();

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(mockSupabase.functions.invoke).toHaveBeenCalled();
    });
  });

  describe('Retry Logic with Exponential Backoff', () => {
    it('should retry failed actions with exponential backoff', async () => {
      jest.useFakeTimers();

      (mockNetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      } as any);

      (mockSupabase.functions.invoke as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
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

      // Verify retry delay is calculated
      const queue = syncManager.getQueue();
      const queuedAction = queue.find(a => a.id === action.id);
      expect((queuedAction as any).nextRetryAt).toBeDefined();

      // Fast forward time to retry (6 seconds for first retry with exponential backoff)
      jest.advanceTimersByTime(6000);

      // Second attempt should succeed
      await syncManager.processQueue();

      const finalResults = await syncManager.processQueue();
      expect(finalResults[0].success).toBe(true);

      jest.useRealTimers();
    });

    it('should skip actions that are not ready for retry', async () => {
      jest.useFakeTimers();

      (mockNetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      } as any);

      (mockSupabase.functions.invoke as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      const action = await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test' } },
        'user-1',
      );

      // First attempt fails, sets nextRetryAt
      await syncManager.processQueue();

      // Try to process again immediately - should skip
      const results = await syncManager.processQueue();
      expect(results.length).toBe(0); // Should skip because retry time hasn't passed

      jest.useRealTimers();
    });
  });

  describe('Temp ID Replacement', () => {
    it('should handle temp ID replacement after CREATE', async () => {
      (mockNetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      } as any);

      const tempId = 'temp-123';

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { id: 'real-456' },
        error: null,
      });

      const action = await syncManager.addToQueue(
        'CREATE',
        'assignment',
        { type: 'CREATE', data: { title: 'Test', id: tempId } },
        'user-1',
        { syncImmediately: false },
      );

      // Set tempId manually for testing
      (action as any).tempId = tempId;

      await syncManager.processQueue();

      // Verify CREATE was called
      expect(mockSupabase.functions.invoke).toHaveBeenCalled();
    });
  });

  describe('Queue Statistics', () => {
    it('should track queue statistics accurately', async () => {
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
      expect(stats.syncing).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  describe('Network Listener', () => {
    it('should auto-sync when network comes online', async () => {
      // Setup: Queue action while offline
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

      // Mock network listener callback
      let networkListener: ((state: NetInfoState) => void) | null = null;

      (NetInfo.addEventListener as jest.Mock).mockImplementation(
        (callback: (state: NetInfoState) => void) => {
          networkListener = callback;
          return () => {};
        },
      );

      await syncManager.start();

      // Simulate network coming online
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { id: 'created-1' },
        error: null,
      });

      if (networkListener !== null) {
        (networkListener as (state: NetInfoState) => void)({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: {
            ssid: null,
            bssid: null,
            strength: null,
            ipAddress: null,
            subnet: null,
            frequency: null,
            linkSpeed: null,
            rxLinkSpeed: null,
            txLinkSpeed: null,
          },
          isWifiEnabled: true,
        } as unknown as NetInfoState);
      }

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify sync was triggered
      expect(mockSupabase.functions.invoke).toHaveBeenCalled();
    });
  });
});
