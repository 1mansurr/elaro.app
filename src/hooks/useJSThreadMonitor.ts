import { useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

interface JSThreadMetrics {
  frameCount: number;
  slowFrameCount: number;
  averageFrameTime: number;
  slowFrameThreshold: number;
}

interface UseJSThreadMonitorOptions {
  enabled?: boolean;
  slowFrameThreshold?: number; // Threshold in milliseconds (default: 20ms = 50fps)
  logSlowFrames?: boolean;
}

/**
 * Hook to monitor JavaScript thread performance
 * Tracks frame times and detects slow frames that could cause UI jank
 *
 * @param options - Configuration options
 * @returns Metrics object with performance data
 *
 * @example
 * ```tsx
 * const MyScreen = () => {
 *   const metrics = useJSThreadMonitor({ enabled: __DEV__ });
 *
 *   // Use metrics to show performance warnings in dev
 *   if (metrics.slowFrameCount > 10) {
 *     console.warn('Many slow frames detected');
 *   }
 *
 *   return <View>...</View>;
 * };
 * ```
 */
export const useJSThreadMonitor = (
  options: UseJSThreadMonitorOptions = {},
): JSThreadMetrics => {
  const {
    enabled = true, // Changed from __DEV__ to enable in production
    slowFrameThreshold = 20, // 20ms = 50fps (60fps = 16.67ms)
    logSlowFrames = __DEV__, // Only log in dev
  } = options;

  const frameCountRef = useRef(0);
  const slowFrameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const frameTimesRef = useRef<number[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);

  const [metrics, setMetrics] = useState<JSThreadMetrics>({
    frameCount: 0,
    slowFrameCount: 0,
    averageFrameTime: 0,
    slowFrameThreshold,
  });

  useEffect(() => {
    if (!enabled) return;

    const monitorFrame = () => {
      const now = performance.now();
      const frameTime = now - lastFrameTimeRef.current;

      // Track frame time
      frameTimesRef.current.push(frameTime);

      // Keep only last 60 frames (1 second at 60fps)
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Calculate average frame time
      const averageFrameTime =
        frameTimesRef.current.reduce((sum, time) => sum + time, 0) /
        frameTimesRef.current.length;

      // Detect slow frames
      if (frameTime > slowFrameThreshold) {
        slowFrameCountRef.current++;

        if (logSlowFrames) {
          console.warn(
            `[JS Thread] Slow frame detected: ${frameTime.toFixed(2)}ms (threshold: ${slowFrameThreshold}ms)`,
          );
        }
      }

      frameCountRef.current++;
      lastFrameTimeRef.current = now;

      // Update metrics periodically (every 60 frames = ~1 second)
      if (frameCountRef.current % 60 === 0) {
        setMetrics({
          frameCount: frameCountRef.current,
          slowFrameCount: slowFrameCountRef.current,
          averageFrameTime: averageFrameTime,
          slowFrameThreshold,
        });

        // Production monitoring: Track performance metrics (sampled: 1% of users)
        if (
          !__DEV__ &&
          typeof window !== 'undefined' &&
          (window as any).mixpanel
        ) {
          // Only send analytics if slow frames are detected
          if (slowFrameCountRef.current > 0 && Math.random() < 0.01) {
            try {
              const { analyticsService } = require('@/services/analytics');
              analyticsService.track('js_thread_performance', {
                slowFrameCount: slowFrameCountRef.current,
                averageFrameTime: averageFrameTime,
                frameCount: frameCountRef.current,
                threshold: slowFrameThreshold,
              });
            } catch (error) {
              // Silently fail - analytics should not break the app
            }
          }
        }
      }

      // Schedule next frame
      animationFrameIdRef.current = requestAnimationFrame(monitorFrame);
    };

    // Start monitoring
    animationFrameIdRef.current = requestAnimationFrame(monitorFrame);

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [enabled, slowFrameThreshold, logSlowFrames]);

  return metrics;
};

/**
 * Hook to schedule heavy operations after interactions complete
 * Helps prevent blocking the JS thread during user interactions
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const scheduleHeavyWork = useScheduleAfterInteractions();
 *
 *   const handleHeavyOperation = () => {
 *     scheduleHeavyWork(() => {
 *       // Heavy computation or data processing
 *       processLargeDataset();
 *     });
 *   };
 *
 *   return <Button onPress={handleHeavyOperation} />;
 * };
 * ```
 */
export const useScheduleAfterInteractions = () => {
  return (callback: () => void) => {
    InteractionManager.runAfterInteractions(() => {
      callback();
    });
  };
};
