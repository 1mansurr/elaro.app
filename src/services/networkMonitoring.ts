/**
 * Network Monitoring Service
 *
 * Tracks network request metrics including latency, success rates, and error patterns.
 * Provides insights into network performance for debugging and optimization.
 */

interface NetworkMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  requestSizes: number[];
  responseSizes: number[];
  errorCounts: Record<string, number>;
  requestTimestamps: number[];
}

interface RequestInfo {
  url: string;
  method: string;
  size: number;
  timestamp: number;
}

class NetworkMonitoringService {
  private static instance: NetworkMonitoringService;
  private metrics: NetworkMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageLatency: 0,
    requestSizes: [],
    responseSizes: [],
    errorCounts: {},
    requestTimestamps: [],
  };

  private activeRequests: Map<string, RequestInfo> = new Map();

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): NetworkMonitoringService {
    if (!NetworkMonitoringService.instance) {
      NetworkMonitoringService.instance = new NetworkMonitoringService();
    }
    return NetworkMonitoringService.instance;
  }

  /**
   * Track the start of a network request
   */
  trackRequest(url: string, method: string, size: number): string {
    const requestId = `${Date.now()}-${Math.random()}`;
    this.metrics.totalRequests++;
    this.metrics.requestSizes.push(size);
    this.metrics.requestTimestamps.push(Date.now());

    // Keep only last 1000 timestamps
    if (this.metrics.requestTimestamps.length > 1000) {
      this.metrics.requestTimestamps.shift();
    }

    // Keep only last 1000 request sizes
    if (this.metrics.requestSizes.length > 1000) {
      this.metrics.requestSizes.shift();
    }

    this.activeRequests.set(requestId, {
      url,
      method,
      size,
      timestamp: Date.now(),
    });

    return requestId;
  }

  /**
   * Track the completion of a network request
   */
  trackResponse(
    requestId: string,
    url: string,
    status: number,
    size: number,
  ): void {
    const requestInfo = this.activeRequests.get(requestId);
    if (!requestInfo) {
      console.warn(
        `NetworkMonitoring: Request ${requestId} not found in active requests`,
      );
      return;
    }

    const latency = Date.now() - requestInfo.timestamp;
    this.activeRequests.delete(requestId);

    if (status >= 200 && status < 300) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    this.metrics.responseSizes.push(size);

    // Keep only last 1000 response sizes
    if (this.metrics.responseSizes.length > 1000) {
      this.metrics.responseSizes.shift();
    }

    // Update average latency (exponential moving average)
    if (this.metrics.totalRequests === 1) {
      this.metrics.averageLatency = latency;
    } else {
      // Use exponential moving average with alpha = 0.1 for smooth updates
      const alpha = 0.1;
      this.metrics.averageLatency =
        alpha * latency + (1 - alpha) * this.metrics.averageLatency;
    }
  }

  /**
   * Track a network error
   */
  trackError(requestId: string, url: string, error: Error): void {
    const requestInfo = this.activeRequests.get(requestId);
    if (requestInfo) {
      this.activeRequests.delete(requestId);
    }

    this.metrics.failedRequests++;
    const errorType = error.name || 'UnknownError';
    this.metrics.errorCounts[errorType] =
      (this.metrics.errorCounts[errorType] || 0) + 1;
  }

  /**
   * Get current network metrics
   */
  getMetrics(): NetworkMetrics {
    return {
      ...this.metrics,
      // Create copies of arrays to prevent external mutation
      requestSizes: [...this.metrics.requestSizes],
      responseSizes: [...this.metrics.responseSizes],
      requestTimestamps: [...this.metrics.requestTimestamps],
      errorCounts: { ...this.metrics.errorCounts },
    };
  }

  /**
   * Get success rate as a percentage
   */
  getSuccessRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.successfulRequests / this.metrics.totalRequests) * 100;
  }

  /**
   * Get average request size
   */
  getAverageRequestSize(): number {
    if (this.metrics.requestSizes.length === 0) return 0;
    const sum = this.metrics.requestSizes.reduce((acc, size) => acc + size, 0);
    return sum / this.metrics.requestSizes.length;
  }

  /**
   * Get average response size
   */
  getAverageResponseSize(): number {
    if (this.metrics.responseSizes.length === 0) return 0;
    const sum = this.metrics.responseSizes.reduce((acc, size) => acc + size, 0);
    return sum / this.metrics.responseSizes.length;
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      requestSizes: [],
      responseSizes: [],
      errorCounts: {},
      requestTimestamps: [],
    };
    this.activeRequests.clear();
    console.log('📊 NetworkMonitoring: Metrics reset');
  }

  /**
   * Get metrics summary for logging
   */
  getSummary(): string {
    const successRate = this.getSuccessRate();
    const avgRequestSize = this.getAverageRequestSize();
    const avgResponseSize = this.getAverageResponseSize();

    return `
📊 Network Metrics Summary:
  Total Requests: ${this.metrics.totalRequests}
  Success Rate: ${successRate.toFixed(1)}%
  Failed Requests: ${this.metrics.failedRequests}
  Avg Latency: ${this.metrics.averageLatency.toFixed(0)}ms
  Avg Request Size: ${(avgRequestSize / 1024).toFixed(2)}KB
  Avg Response Size: ${(avgResponseSize / 1024).toFixed(2)}KB
  Error Types: ${Object.keys(this.metrics.errorCounts).length}
    `;
  }
}

export const networkMonitoring = NetworkMonitoringService.getInstance();
