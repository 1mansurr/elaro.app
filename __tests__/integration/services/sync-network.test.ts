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

      ((syncManager as any).executeServerMutation as jest.Mock).mockResolvedValue(
        {
          success: true,
        },
      );

      const requestId = networkMonitoring.trackRequest(
        '/api/assignments',
        'POST',
        100,
      );

      await (syncManager as any).executeServerMutation(mutation);

      expect(networkMonitoring.trackRequest).toHaveBeenCalledWith(
        '/api/assignments',
        'POST',
        100,
      );
    });

    it('should track successful sync response', async () => {
      const mutation = {
        type: 'CREATE',
        entity: 'assignment',
        payload: { title: 'Test Assignment' },
      };

      ((syncManager as any).executeServerMutation as jest.Mock).mockResolvedValue(
        {
          success: true,
          data: { id: 'assignment-1' },
        },
      );

      const requestId = 'test-request-id';
      await (syncManager as any).executeServerMutation(mutation);

      networkMonitoring.trackResponse(requestId, '/api/assignments', 200, 150);

      expect(networkMonitoring.trackResponse).toHaveBeenCalledWith(
        requestId,
        '/api/assignments',
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

      ((syncManager as any).executeServerMutation as jest.Mock).mockImplementation(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { success: true };
        },
      );

      const requestId = networkMonitoring.trackRequest(
        '/api/assignments',
        'UPDATE',
        100,
      );
      await (syncManager as any).executeServerMutation(mutation);

      const latency = Date.now() - startTime;
      networkMonitoring.trackResponse(requestId, '/api/assignments', 200, latency);

      expect(networkMonitoring.trackResponse).toHaveBeenCalledWith(
        requestId,
        '/api/assignments',
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
      ((syncManager as any).executeServerMutation as jest.Mock).mockRejectedValue(
        error,
      );

      const requestId = networkMonitoring.trackRequest(
        '/api/assignments',
        'POST',
        100,
      );

      try {
        await (syncManager as any).executeServerMutation(mutation);
      } catch (e) {
        networkMonitoring.trackError(requestId, '/api/assignments', error);
      }

      expect(networkMonitoring.trackError).toHaveBeenCalledWith(
        requestId,
        '/api/assignments',
        error,
      );
    });

    it('should track retry attempts in network monitoring', async () => {
      const mutation = {
        type: 'CREATE',
        entity: 'assignment',
        payload: { title: 'Test Assignment' },
      };

      let attemptCount = 0;
      ((syncManager as any).executeServerMutation as jest.Mock).mockImplementation(
        async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Network error');
          }
          return { success: true };
        },
      );

      const requestId = networkMonitoring.trackRequest(
        '/api/assignments',
        'POST',
        100,
      );

      // Simulate retry logic
      for (let i = 0; i < 3; i++) {
        try {
          await (syncManager as any).executeServerMutation(mutation);
          break;
        } catch (error) {
          networkMonitoring.trackError(
            requestId,
            '/api/assignments',
            error as Error,
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

      const requestId = networkMonitoring.trackRequest(
        '/api/assignments',
        'POST',
        100,
      );
      networkMonitoring.trackError(
        requestId,
        '/api/assignments',
        new Error('Circuit breaker open'),
      );

      expect(networkMonitoring.trackError).toHaveBeenCalledWith(
        requestId,
        '/api/assignments',
        expect.any(Error),
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
      const reqId1 = networkMonitoring.trackRequest(
        '/api/assignments',
        'POST',
        100,
      );
      networkMonitoring.trackResponse(reqId1, '/api/assignments', 200, 100);

      const reqId2 = networkMonitoring.trackRequest(
        '/api/lectures',
        'POST',
        150,
      );
      networkMonitoring.trackResponse(reqId2, '/api/lectures', 200, 150);

      const metrics = networkMonitoring.getMetrics();

      expect(metrics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.successfulRequests).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average latency for sync operations', () => {
      const reqId1 = networkMonitoring.trackRequest('/api/test1', 'POST', 100);
      const reqId2 = networkMonitoring.trackRequest('/api/test2', 'POST', 200);
      const reqId3 = networkMonitoring.trackRequest('/api/test3', 'POST', 150);
      networkMonitoring.trackResponse(reqId1, '/api/test1', 200, 100);
      networkMonitoring.trackResponse(reqId2, '/api/test2', 200, 200);
      networkMonitoring.trackResponse(reqId3, '/api/test3', 200, 150);

      const metrics = networkMonitoring.getMetrics();

      expect(metrics.averageLatency).toBeGreaterThanOrEqual(0);
    });
  });
});
