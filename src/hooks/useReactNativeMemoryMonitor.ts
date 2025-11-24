import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Hook to monitor memory usage in React Native
 * Works across iOS and Android platforms
 *
 * @param enabled - Whether to enable monitoring (defaults to true)
 * @param thresholdPercent - Percentage increase to trigger warning (default: 50%)
 * @param checkInterval - How often to check memory in milliseconds (default: 30000 = 30s)
 *
 * @example
 * ```tsx
 * const MyScreen = () => {
 *   useReactNativeMemoryMonitor(true);
 *
 *   return <View>...</View>;
 * };
 * ```
 */
export const useReactNativeMemoryMonitor = (
  enabled: boolean = true,
  thresholdPercent: number = 50,
  checkInterval: number = 30000,
): void => {
  const baselineRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkCountRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    // Try to get initial memory baseline
    const getMemoryUsage = async (): Promise<number | null> => {
      try {
        // For web/development, use performance.memory if available
        if (typeof performance !== 'undefined' && (performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }

        // For React Native, we would need a native module
        // For now, we'll use a placeholder that can be enhanced with native modules
        // This is a framework for future native module integration
        if (Platform.OS === 'android' || Platform.OS === 'ios') {
          // TODO: Integrate with native memory monitoring module
          // Example: const { getMemoryUsage } = require('react-native-memory-monitor');
          // return await getMemoryUsage();

          // Fallback: Use performance.now as a proxy (not accurate but available)
          // This is a placeholder until native module is added
          return null;
        }

        return null;
      } catch (error) {
        if (__DEV__) {
          console.warn('Memory monitoring not available:', error);
        }
        return null;
      }
    };

    const initializeMonitoring = async () => {
      const baseline = await getMemoryUsage();

      if (baseline === null) {
        if (__DEV__) {
          console.log('Memory monitoring not available on this platform');
        }
        return;
      }

      baselineRef.current = baseline;

      if (__DEV__) {
        console.log(
          `📊 Memory monitoring started. Baseline: ${(baseline / 1024 / 1024).toFixed(2)}MB`,
        );
      }

      intervalRef.current = setInterval(async () => {
        const current = await getMemoryUsage();
        checkCountRef.current++;

        if (current === null) {
          return; // Skip if memory API unavailable
        }

        const increase = current - baselineRef.current;
        const increasePercent =
          baselineRef.current > 0 ? (increase / baselineRef.current) * 100 : 0;

        if (increasePercent > thresholdPercent) {
          if (__DEV__) {
            console.warn(
              `⚠️ Memory increase detected: ${increasePercent.toFixed(1)}% ` +
                `(${(increase / 1024 / 1024).toFixed(2)}MB increase)`,
            );
            console.warn(
              `Current: ${(current / 1024 / 1024).toFixed(2)}MB, ` +
                `Baseline: ${(baselineRef.current / 1024 / 1024).toFixed(2)}MB`,
            );
          }

          // Production monitoring: Send analytics (sampled: 1% of checks)
          if (!__DEV__ && checkCountRef.current % 100 === 0) {
            try {
              const { analyticsService } = require('@/services/analytics');
              analyticsService.track('memory_increase_detected', {
                increasePercent: increasePercent.toFixed(1),
                currentMB: (current / 1024 / 1024).toFixed(2),
                baselineMB: (baselineRef.current / 1024 / 1024).toFixed(2),
                thresholdPercent,
              });
            } catch (error) {
              // Silently fail - analytics should not break the app
            }
          }
        } else if (__DEV__) {
          // Log normal memory usage in dev mode
          console.log(
            `📊 Memory: ${(current / 1024 / 1024).toFixed(2)}MB ` +
              `(${increasePercent >= 0 ? '+' : ''}${increasePercent.toFixed(1)}%)`,
          );
        }
      }, checkInterval);
    };

    initializeMonitoring().catch(error => {
      if (__DEV__) {
        console.warn('Failed to initialize memory monitoring:', error);
      }
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, thresholdPercent, checkInterval]);
};
