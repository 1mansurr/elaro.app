/**
 * Production Monitoring Hook
 *
 * Integrates JS thread monitoring, memory monitoring, and network monitoring
 * to provide comprehensive production monitoring.
 */

import { useEffect } from 'react';
import { productionMonitoring } from '@/services/productionMonitoring';
import { networkMonitoring } from '@/services/networkMonitoring';
import { useJSThreadMonitor } from './useJSThreadMonitor';
import { useMemoryMonitor } from './useMemoryMonitor';

const MONITORING_INTERVAL = 30000; // 30 seconds

/**
 * Hook to enable comprehensive production monitoring
 */
export function useProductionMonitoring(enabled: boolean = __DEV__) {
  const { frameTime, slowFrameCount } = useJSThreadMonitor({ enabled });
  const { memoryUsage, warningCount } = useMemoryMonitor({ enabled });

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const networkMetrics = networkMonitoring.getMetrics();
      const errorRate =
        networkMetrics.totalRequests > 0
          ? networkMetrics.failedRequests / networkMetrics.totalRequests
          : 0;

      // Track all metrics
      productionMonitoring.trackMetrics({
        jsThreadTime: frameTime,
        memoryUsage,
        networkLatency: networkMetrics.averageLatency,
        errorRate,
      });

      // Report health status
      const health = productionMonitoring.reportHealth();
      if (health.status !== 'healthy') {
        console.warn(
          '⚠️ Production health status:',
          health.status,
          health.issues,
        );
      }
    }, MONITORING_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, frameTime, memoryUsage]);

  return {
    health: productionMonitoring.reportHealth(),
    metrics: productionMonitoring.getMetricsSummary(),
  };
}
