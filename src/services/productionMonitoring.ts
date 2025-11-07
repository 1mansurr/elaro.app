/**
 * Production Monitoring Service
 *
 * Provides comprehensive monitoring for production environments:
 * - Performance metrics tracking
 * - Error rate monitoring
 * - Alert thresholds
 * - Integration with analytics and error tracking
 */

import { errorTracking } from './errorTracking';
import { mixpanelService } from './mixpanel';
import { networkMonitoring } from './networkMonitoring';

interface PerformanceMetrics {
  timestamp: number;
  jsThreadTime: number;
  memoryUsage: number;
  networkLatency: number;
  errorRate: number;
}

interface AlertThreshold {
  metric: string;
  threshold: number;
  severity: 'warning' | 'error';
  enabled: boolean;
}

/**
 * Default alert thresholds
 */
const DEFAULT_THRESHOLDS: AlertThreshold[] = [
  { metric: 'jsThreadTime', threshold: 16, severity: 'warning', enabled: true }, // 16ms = 60fps
  {
    metric: 'memoryUsage',
    threshold: 100 * 1024 * 1024,
    severity: 'warning',
    enabled: true,
  }, // 100MB
  {
    metric: 'networkLatency',
    threshold: 3000,
    severity: 'warning',
    enabled: true,
  }, // 3 seconds
  { metric: 'errorRate', threshold: 0.1, severity: 'error', enabled: true }, // 10% error rate
];

class ProductionMonitoringService {
  private static instance: ProductionMonitoringService;
  private thresholds: AlertThreshold[] = DEFAULT_THRESHOLDS;
  private metricsHistory: PerformanceMetrics[] = [];
  private readonly MAX_HISTORY = 100;

  static getInstance(): ProductionMonitoringService {
    if (!ProductionMonitoringService.instance) {
      ProductionMonitoringService.instance = new ProductionMonitoringService();
    }
    return ProductionMonitoringService.instance;
  }

  /**
   * Track performance metrics
   */
  trackMetrics(metrics: Partial<PerformanceMetrics>): void {
    const fullMetrics: PerformanceMetrics = {
      timestamp: Date.now(),
      jsThreadTime: metrics.jsThreadTime || 0,
      memoryUsage: metrics.memoryUsage || 0,
      networkLatency: metrics.networkLatency || 0,
      errorRate: metrics.errorRate || 0,
    };

    // Add to history
    this.metricsHistory.push(fullMetrics);
    if (this.metricsHistory.length > this.MAX_HISTORY) {
      this.metricsHistory.shift();
    }

    // Check thresholds
    this.checkThresholds(fullMetrics);

    // Track to Sentry
    if (fullMetrics.jsThreadTime > 0) {
      errorTracking.trackPerformance(
        'js_thread_time',
        fullMetrics.jsThreadTime,
        'ms',
      );
    }
    if (fullMetrics.memoryUsage > 0) {
      errorTracking.trackPerformance(
        'memory_usage',
        fullMetrics.memoryUsage,
        'bytes',
      );
    }
    if (fullMetrics.networkLatency > 0) {
      errorTracking.trackPerformance(
        'network_latency',
        fullMetrics.networkLatency,
        'ms',
      );
    }

    // Track to analytics
    mixpanelService.trackEvent('performance_metrics', {
      jsThreadTime: fullMetrics.jsThreadTime,
      memoryUsage: fullMetrics.memoryUsage,
      networkLatency: fullMetrics.networkLatency,
      errorRate: fullMetrics.errorRate,
    });
  }

  /**
   * Check thresholds and alert if exceeded
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    for (const threshold of this.thresholds) {
      if (!threshold.enabled) continue;

      const value = metrics[
        threshold.metric as keyof PerformanceMetrics
      ] as number;
      if (value === undefined) continue;

      if (value > threshold.threshold) {
        const exceeded = value - threshold.threshold;
        const percentage = (exceeded / threshold.threshold) * 100;

        // Log to error tracking
        errorTracking.checkThreshold(
          threshold.metric,
          value,
          threshold.threshold,
          threshold.severity,
        );

        // Track to analytics
        mixpanelService.trackEvent('threshold_exceeded', {
          metric: threshold.metric,
          value,
          threshold: threshold.threshold,
          exceeded,
          percentage,
          severity: threshold.severity,
        });

        console.warn(
          `⚠️ ${threshold.metric} threshold exceeded: ${value} > ${threshold.threshold} (+${percentage.toFixed(1)}%)`,
        );
      }
    }
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary(): {
    average: PerformanceMetrics;
    max: PerformanceMetrics;
    min: PerformanceMetrics;
    current: PerformanceMetrics | null;
  } {
    if (this.metricsHistory.length === 0) {
      return {
        average: this.getEmptyMetrics(),
        max: this.getEmptyMetrics(),
        min: this.getEmptyMetrics(),
        current: null,
      };
    }

    const current = this.metricsHistory[this.metricsHistory.length - 1];
    const average = this.calculateAverage();
    const max = this.calculateMax();
    const min = this.calculateMin();

    return { average, max, min, current };
  }

  /**
   * Get error rate from network monitoring
   */
  getErrorRate(): number {
    const networkMetrics = networkMonitoring.getMetrics();
    if (networkMetrics.totalRequests === 0) return 0;

    return networkMetrics.failedRequests / networkMetrics.totalRequests;
  }

  /**
   * Report health status
   */
  reportHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: ReturnType<typeof this.getMetricsSummary>;
    issues: string[];
  } {
    const metrics = this.getMetricsSummary();
    const issues: string[] = [];

    // Check each threshold
    for (const threshold of this.thresholds) {
      if (!threshold.enabled) continue;

      const current = metrics.current?.[
        threshold.metric as keyof PerformanceMetrics
      ] as number;
      if (current === undefined) continue;

      if (current > threshold.threshold) {
        issues.push(
          `${threshold.metric} exceeded threshold (${current} > ${threshold.threshold})`,
        );
      }
    }

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 0) {
      const errorIssues = issues.filter(issue => {
        const threshold = this.thresholds.find(t => issue.includes(t.metric));
        return threshold?.severity === 'error';
      });
      status = errorIssues.length > 0 ? 'unhealthy' : 'degraded';
    }

    return { status, metrics, issues };
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      timestamp: Date.now(),
      jsThreadTime: 0,
      memoryUsage: 0,
      networkLatency: 0,
      errorRate: 0,
    };
  }

  private calculateAverage(): PerformanceMetrics {
    const sum = this.metricsHistory.reduce(
      (acc, m) => ({
        jsThreadTime: acc.jsThreadTime + m.jsThreadTime,
        memoryUsage: acc.memoryUsage + m.memoryUsage,
        networkLatency: acc.networkLatency + m.networkLatency,
        errorRate: acc.errorRate + m.errorRate,
        timestamp: 0,
      }),
      this.getEmptyMetrics(),
    );

    const count = this.metricsHistory.length;
    return {
      timestamp: Date.now(),
      jsThreadTime: sum.jsThreadTime / count,
      memoryUsage: sum.memoryUsage / count,
      networkLatency: sum.networkLatency / count,
      errorRate: sum.errorRate / count,
    };
  }

  private calculateMax(): PerformanceMetrics {
    return this.metricsHistory.reduce(
      (max, m) => ({
        timestamp: Date.now(),
        jsThreadTime: Math.max(max.jsThreadTime, m.jsThreadTime),
        memoryUsage: Math.max(max.memoryUsage, m.memoryUsage),
        networkLatency: Math.max(max.networkLatency, m.networkLatency),
        errorRate: Math.max(max.errorRate, m.errorRate),
      }),
      this.getEmptyMetrics(),
    );
  }

  private calculateMin(): PerformanceMetrics {
    return this.metricsHistory.reduce(
      (min, m) => ({
        timestamp: Date.now(),
        jsThreadTime: Math.min(min.jsThreadTime || Infinity, m.jsThreadTime),
        memoryUsage: Math.min(min.memoryUsage || Infinity, m.memoryUsage),
        networkLatency: Math.min(
          min.networkLatency || Infinity,
          m.networkLatency,
        ),
        errorRate: Math.min(min.errorRate || Infinity, m.errorRate),
      }),
      {
        timestamp: Date.now(),
        jsThreadTime: Infinity,
        memoryUsage: Infinity,
        networkLatency: Infinity,
        errorRate: Infinity,
      },
    );
  }
}

export const productionMonitoring = ProductionMonitoringService.getInstance();
