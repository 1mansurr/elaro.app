import { useEffect, useRef } from 'react';

/**
 * Hook to monitor memory usage and detect potential memory leaks
 *
 * Tracks memory usage over time and warns if memory increases significantly.
 * Only works in development mode and when performance.memory API is available.
 *
 * @param enabled - Whether to enable monitoring (defaults to __DEV__)
 * @param thresholdPercent - Percentage increase to trigger warning (default: 50%)
 * @param checkInterval - How often to check memory in milliseconds (default: 30000 = 30s)
 *
 * @example
 * ```tsx
 * const MyScreen = () => {
 *   useMemoryMonitor(__DEV__);
 *
 *   return <View>...</View>;
 * };
 * ```
 */
export const useMemoryMonitor = (
  enabled: boolean = __DEV__,
  thresholdPercent: number = 50,
  checkInterval: number = 30000,
): void => {
  const baselineRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || typeof performance === 'undefined') return;

    // Check if memory API is available (Chrome/Edge only)
    if (!(performance as any).memory) {
      if (__DEV__) {
        console.log(
          'Memory monitoring not available (performance.memory API not supported)',
        );
      }
      return;
    }

    const memory = (performance as any).memory;
    baselineRef.current = memory.usedJSHeapSize;

    if (__DEV__) {
      console.log(
        `📊 Memory monitoring started. Baseline: ${(baselineRef.current / 1024 / 1024).toFixed(2)}MB`,
      );
    }

    intervalRef.current = setInterval(() => {
      const current = memory.usedJSHeapSize;
      const increase = current - baselineRef.current;
      const increasePercent = (increase / baselineRef.current) * 100;

      if (increasePercent > thresholdPercent) {
        console.warn(
          `⚠️ Memory increase detected: ${increasePercent.toFixed(1)}% ` +
            `(${(increase / 1024 / 1024).toFixed(2)}MB increase)`,
        );
        console.warn(
          `Current: ${(current / 1024 / 1024).toFixed(2)}MB, ` +
            `Baseline: ${(baselineRef.current / 1024 / 1024).toFixed(2)}MB`,
        );
      } else if (__DEV__) {
        // Log normal memory usage in dev mode
        console.log(
          `📊 Memory: ${(current / 1024 / 1024).toFixed(2)}MB ` +
            `(${increasePercent >= 0 ? '+' : ''}${increasePercent.toFixed(1)}%)`,
        );
      }
    }, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, thresholdPercent, checkInterval]);
};
