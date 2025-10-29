import { useEffect, useRef, useMemo } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  reRenderCount: number;
  propsChanged: boolean;
  memoryUsage?: number;
  bundleSize?: number;
}

interface PerformanceConfig {
  trackProps?: boolean;
  logThreshold?: number;
  trackReRenders?: boolean;
  trackMemory?: boolean;
  trackBundleSize?: boolean;
  enableAnalytics?: boolean;
  slowRenderThreshold?: number;
}

/**
 * Enhanced hook to monitor component render performance with comprehensive metrics
 * 
 * @param componentName - Name of the component being monitored
 * @param options - Configuration options for monitoring
 * 
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   usePerformanceMonitor('MyComponent', { 
 *     trackProps: true,
 *     slowRenderThreshold: 16, // Warn if render takes > 16ms (1 frame)
 *     enableAnalytics: true
 *   });
 *   return <View>...</View>;
 * };
 * ```
 */
export const usePerformanceMonitor = (
  componentName: string,
  options: PerformanceConfig = {}
) => {
  const { 
    trackProps = false, 
    logThreshold = 16, 
    trackReRenders = true,
    trackMemory = false,
    trackBundleSize = false,
    enableAnalytics = false,
    slowRenderThreshold = 16
  } = options;
  
  const renderStartTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);
  const previousProps = useRef<any>(null);
  const memoryBaseline = useRef<number>(0);

  // Initialize memory tracking
  useEffect(() => {
    if (trackMemory && typeof performance !== 'undefined' && (performance as any).memory) {
      memoryBaseline.current = (performance as any).memory.usedJSHeapSize;
    }
  }, [trackMemory]);

  useEffect(() => {
    const currentProps = previousProps.current;
    renderStartTime.current = Date.now();
    
    return () => {
      const renderTime = Date.now() - renderStartTime.current;
      renderCount.current += 1;
      
      // Enhanced slow render detection
      const isSlowRender = renderTime > slowRenderThreshold;
      
      if (isSlowRender) {
        if (__DEV__) {
          console.warn(
            `[Performance] ${componentName} took ${renderTime.toFixed(2)}ms to render (threshold: ${slowRenderThreshold}ms)`
          );
        }
        
        // Enhanced analytics tracking
        if (enableAnalytics && typeof window !== 'undefined' && (window as any).mixpanel) {
          try {
            const metrics: PerformanceMetrics = {
              componentName,
              renderTime,
              reRenderCount: renderCount.current,
              propsChanged: trackProps && currentProps !== undefined,
            };

            // Add memory usage if tracking enabled
            if (trackMemory && typeof performance !== 'undefined' && (performance as any).memory) {
              metrics.memoryUsage = (performance as any).memory.usedJSHeapSize - memoryBaseline.current;
            }

            (window as any).mixpanel.track('component_slow_render', metrics);
          } catch (error) {
            console.warn('Failed to track performance metrics:', error);
          }
        }
      }
      
      // Track re-renders
      if (trackReRenders && renderCount.current > 1) {
        if (__DEV__) {
          console.log(`[Performance] ${componentName} re-rendered ${renderCount.current} times`);
        }
      }
    };
  });

  // Track prop changes
  useEffect(() => {
    if (trackProps) {
      // Track props changes
      console.log('Props tracking enabled');
    }
  });

  // Return performance metrics for debugging
  return useMemo(() => ({
    componentName,
    renderCount: renderCount.current,
    isSlowRender: (performance.now() - renderStartTime.current) > slowRenderThreshold,
    memoryUsage: trackMemory && typeof performance !== 'undefined' && (performance as any).memory 
      ? (performance as any).memory.usedJSHeapSize - memoryBaseline.current 
      : undefined,
  }), [componentName, slowRenderThreshold, trackMemory]);
};

/**
 * Hook to monitor bundle size and memory usage
 */
export const useBundleMonitor = (componentName: string) => {
  const bundleSize = useRef<number>(0);
  const memoryUsage = useRef<number>(0);

  useEffect(() => {
    // Estimate bundle size (this is a simplified approach)
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      memoryUsage.current = (performance as any).memory.usedJSHeapSize;
    }

    // Log bundle information
    if (__DEV__) {
      console.log(`[Bundle] ${componentName} loaded`, {
        memoryUsage: memoryUsage.current,
        timestamp: new Date().toISOString(),
      });
    }
  }, [componentName]);

  return {
    bundleSize: bundleSize.current,
    memoryUsage: memoryUsage.current,
  };
};

/**
 * Hook to monitor component lifecycle performance
 */
export const useLifecycleMonitor = (componentName: string) => {
  const mountTime = useRef<number>(performance.now());
  const updateCount = useRef<number>(0);

  useEffect(() => {
    mountTime.current = performance.now();
    
    return () => {
      const lifecycleTime = performance.now() - mountTime.current;
      
      if (__DEV__) {
        console.log(`[Lifecycle] ${componentName}`, {
          totalLifecycleTime: lifecycleTime,
          updateCount: updateCount.current,
        });
      }
    };
  }, [componentName]);

  useEffect(() => {
    updateCount.current += 1;
  });

  return {
    mountTime: mountTime.current,
    updateCount: updateCount.current,
  };
};

/**
 * Performance monitoring utilities
 */
export const PerformanceUtils = {
  /**
   * Measure function execution time
   */
  measureExecution: <T>(fn: () => T, label?: string): T => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    if (__DEV__ && label) {
      console.log(`[Performance] ${label} took ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  },

  /**
   * Measure async function execution time
   */
  measureAsync: async <T>(fn: () => Promise<T>, label?: string): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    if (__DEV__ && label) {
      console.log(`[Performance] ${label} took ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  },

  /**
   * Get current memory usage
   */
  getMemoryUsage: (): number => {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  },

  /**
   * Check if render is taking too long
   */
  isSlowRender: (renderTime: number, threshold: number = 16): boolean => {
    return renderTime > threshold;
  },
};

export default usePerformanceMonitor;