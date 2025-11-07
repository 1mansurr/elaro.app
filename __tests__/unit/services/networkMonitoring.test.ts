import { networkMonitoring } from '@/services/networkMonitoring';

describe('NetworkMonitoringService', () => {
  beforeEach(() => {
    networkMonitoring.resetMetrics();
  });

  describe('Request Tracking', () => {
    it('should track request start', () => {
      const requestId = networkMonitoring.trackRequest(
        'https://api.example.com/data',
        'GET',
        100,
      );

      expect(requestId).toBeDefined();

      const metrics = networkMonitoring.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.requestSizes.length).toBe(1);
    });

    it('should track successful response', () => {
      const requestId = networkMonitoring.trackRequest(
        'https://api.example.com/data',
        'GET',
        100,
      );

      networkMonitoring.trackResponse(
        requestId,
        'https://api.example.com/data',
        200,
        500,
      );

      const metrics = networkMonitoring.getMetrics();
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageLatency).toBeGreaterThanOrEqual(0);
    });

    it('should track failed response', () => {
      const requestId = networkMonitoring.trackRequest(
        'https://api.example.com/data',
        'GET',
        100,
      );

      networkMonitoring.trackResponse(
        requestId,
        'https://api.example.com/data',
        500,
        0,
      );

      const metrics = networkMonitoring.getMetrics();
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(1);
    });

    it('should track errors', () => {
      const requestId = networkMonitoring.trackRequest(
        'https://api.example.com/data',
        'GET',
        100,
      );
      const error = new Error('Network error');
      error.name = 'NetworkError';

      networkMonitoring.trackError(
        requestId,
        'https://api.example.com/data',
        error,
      );

      const metrics = networkMonitoring.getMetrics();
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.errorCounts['NetworkError']).toBe(1);
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate success rate', () => {
      const requestId1 = networkMonitoring.trackRequest('url1', 'GET', 100);
      const requestId2 = networkMonitoring.trackRequest('url2', 'GET', 100);

      networkMonitoring.trackResponse(requestId1, 'url1', 200, 500);
      networkMonitoring.trackResponse(requestId2, 'url2', 500, 0);

      const successRate = networkMonitoring.getSuccessRate();
      expect(successRate).toBe(50);
    });

    it('should calculate average request size', () => {
      networkMonitoring.trackRequest('url1', 'GET', 100);
      networkMonitoring.trackRequest('url2', 'GET', 200);
      networkMonitoring.trackRequest('url3', 'GET', 300);

      const avgSize = networkMonitoring.getAverageRequestSize();
      expect(avgSize).toBe(200);
    });

    it('should calculate average response size', () => {
      const id1 = networkMonitoring.trackRequest('url1', 'GET', 100);
      const id2 = networkMonitoring.trackRequest('url2', 'GET', 100);

      networkMonitoring.trackResponse(id1, 'url1', 200, 500);
      networkMonitoring.trackResponse(id2, 'url2', 200, 1000);

      const avgSize = networkMonitoring.getAverageResponseSize();
      expect(avgSize).toBe(750);
    });
  });

  describe('Metrics Reset', () => {
    it('should reset all metrics', () => {
      networkMonitoring.trackRequest('url1', 'GET', 100);

      networkMonitoring.resetMetrics();

      const metrics = networkMonitoring.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.requestSizes.length).toBe(0);
    });
  });

  describe('Metrics Summary', () => {
    it('should generate metrics summary', () => {
      const requestId = networkMonitoring.trackRequest('url1', 'GET', 100);
      networkMonitoring.trackResponse(requestId, 'url1', 200, 500);

      const summary = networkMonitoring.getSummary();
      expect(summary).toContain('Network Metrics Summary');
      expect(summary).toContain('Total Requests');
      expect(summary).toContain('Success Rate');
    });
  });
});
