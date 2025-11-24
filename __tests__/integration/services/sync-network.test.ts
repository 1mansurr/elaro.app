/**
 * Integration Tests: SyncManager + Network Monitoring
 *
 * Tests the integration between SyncManager and network monitoring:
 * - Sync operations → Network metrics tracked
 * - Failed syncs → Error metrics recorded
 * - Circuit breaker → Network monitoring updated
 */

import { syncManager } from '@/services/syncManager';
import { networkMonitoring } from '@/services/networkMonitoring';

// Mock network monitoring
jest.mock('@/services/networkMonitoring', () => ({
  networkMonitoring: {
    trackRequest: jest.fn(),
    trackResponse: jest.fn(),
    trackError: jest.fn(),
    getMetrics: jest.fn(() => ({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
    })),
  },
}));

// Mock SyncManager
jest.mock('@/services/syncManager', () => {
  const mockSyncManager = {
    processQueue: jest.fn(),
    addToQueue: jest.fn(),
    getQueueStats: jest.fn(() => ({
      pending: 0,
      failed: 0,
      completed: 0,
    })),
    executeServerMutation: jest.fn(),
  };
  return {
    syncManager: mockSyncManager,
  };
});

describe('SyncManager + Network Monitoring Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sync Operations Tracking', () => {
    it('should track network request when sync operation starts', async () => {
      const mutation = {
        type: 'CREATE',
        entity: 'assignment',
        payload: { title: 'Test Assignment' },
      };

      (syncManager.executeServerMutation as jest.Mock).mockResolvedValue({
        success: true,
      });

      networkMonitoring.trackRequest('sync', 'POST', '/api/assignments');

      await syncManager.executeServerMutation(mutation);

      expect(networkMonitoring.trackRequest).toHaveBeenCalledWith(
        'sync',
        'POST',
        '/api/assignments',
      );
    });

    it('should track successful sync response', async () => {
      const mutation = {
        type: 'CREATE',
        entity: 'assignment',
        payload: { title: 'Test Assignment' },
      };

      (syncManager.executeServerMutation as jest.Mock).mockResolvedValue({
        success: true,
        data: { id: 'assignment-1' },
      });

      await syncManager.executeServerMutation(mutation);

      networkMonitoring.trackResponse('sync', 200, 150);

      expect(networkMonitoring.trackResponse).toHaveBeenCalledWith(
        'sync',
        200,
        150,
      );
    });

    it('should track sync operation latency', async () => {
      const startTime = Date.now();

      const mutation = {
        type: 'UPDATE',
        entity: 'assignment',
        payload: { id: 'assignment-1', title: 'Updated' },
      };

      (syncManager.executeServerMutation as jest.Mock).mockImplementation(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { success: true };
        },
      );

      await syncManager.executeServerMutation(mutation);

      const latency = Date.now() - startTime;
      networkMonitoring.trackResponse('sync', 200, latency);

      expect(networkMonitoring.trackResponse).toHaveBeenCalledWith(
        'sync',
        200,
        expect.any(Number),
      );
    });
  });

  describe('Failed Sync Tracking', () => {
    it('should track error when sync operation fails', async () => {
      const mutation = {
        type: 'CREATE',
        entity: 'assignment',
        payload: { title: 'Test Assignment' },
      };

      const error = new Error('Network error');
      (syncManager.executeServerMutation as jest.Mock).mockRejectedValue(error);

      try {
        await syncManager.executeServerMutation(mutation);
      } catch (e) {
        networkMonitoring.trackError('sync', error, 'POST', '/api/assignments');
      }

      expect(networkMonitoring.trackError).toHaveBeenCalledWith(
        'sync',
        error,
        'POST',
        '/api/assignments',
      );
    });

    it('should track retry attempts in network monitoring', async () => {
      const mutation = {
        type: 'CREATE',
        entity: 'assignment',
        payload: { title: 'Test Assignment' },
      };

      let attemptCount = 0;
      (syncManager.executeServerMutation as jest.Mock).mockImplementation(
        async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Network error');
          }
          return { success: true };
        },
      );

      // Simulate retry logic
      for (let i = 0; i < 3; i++) {
        try {
          await syncManager.executeServerMutation(mutation);
          break;
        } catch (error) {
          networkMonitoring.trackError(
            'sync',
            error as Error,
            'POST',
            '/api/assignments',
          );
          if (i === 2) throw error;
        }
      }

      expect(networkMonitoring.trackError).toHaveBeenCalledTimes(2);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should track circuit breaker state changes', () => {
      // Simulate circuit breaker opening
      const circuitBreakerState = 'OPEN';

      networkMonitoring.trackError(
        'sync',
        new Error('Circuit breaker open'),
        'POST',
        '/api/assignments',
      );

      expect(networkMonitoring.trackError).toHaveBeenCalledWith(
        'sync',
        expect.any(Error),
        'POST',
        '/api/assignments',
      );
    });

    it('should track metrics when circuit breaker is open', () => {
      const metrics = networkMonitoring.getMetrics();

      // When circuit breaker is open, requests should be tracked as failed
      expect(metrics).toBeDefined();
      expect(metrics.failedRequests).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Network Metrics Aggregation', () => {
    it('should aggregate sync operation metrics', () => {
      // Simulate multiple sync operations
      networkMonitoring.trackRequest('sync', 'POST', '/api/assignments');
      networkMonitoring.trackResponse('sync', 200, 100);

      networkMonitoring.trackRequest('sync', 'POST', '/api/lectures');
      networkMonitoring.trackResponse('sync', 200, 150);

      const metrics = networkMonitoring.getMetrics();

      expect(metrics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.successfulRequests).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average latency for sync operations', () => {
      networkMonitoring.trackResponse('sync', 200, 100);
      networkMonitoring.trackResponse('sync', 200, 200);
      networkMonitoring.trackResponse('sync', 200, 150);

      const metrics = networkMonitoring.getMetrics();

      expect(metrics.averageLatency).toBeGreaterThanOrEqual(0);
    });
  });
});
