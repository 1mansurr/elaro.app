/**
 * Production Monitoring Hook
 *
 * Integrates JS thread monitoring and memory monitoring.
 */

import { useJSThreadMonitor } from './useJSThreadMonitor';
import { useMemoryMonitor } from './useMemoryMonitor';

/**
 * Hook to enable comprehensive production monitoring
 */
export function useProductionMonitoring(enabled: boolean = __DEV__) {
  useJSThreadMonitor({ enabled });
  useMemoryMonitor(enabled);

  return {
    health: null,
    metrics: null,
  };
}
