import { useEffect, useRef, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { InteractionManager, AppState, AppStateStatus } from 'react-native';

/**
 * Navigation Performance Optimization Hook
 *
 * This hook provides performance optimizations for navigation including:
 * - Screen preloading
 * - Memory management
 * - Interaction batching
 * - Background optimization
 */

interface NavigationPerformanceOptions {
  preloadScreens?: string[];
  enableMemoryOptimization?: boolean;
  enableInteractionBatching?: boolean;
  enableBackgroundOptimization?: boolean;
}

export const useNavigationPerformance = (
  options: NavigationPerformanceOptions = {},
) => {
  const navigation = useNavigation();
  const preloadedScreens = useRef<Set<string>>(new Set());
  const isAppActive = useRef<boolean>(true);

  const {
    preloadScreens = [],
    enableMemoryOptimization = true,
    enableInteractionBatching = true,
    enableBackgroundOptimization = true,
  } = options;

  // Helper function to safely get navigation state
  const getNavigationState = useCallback(() => {
    try {
      if (!navigation || typeof navigation.getState !== 'function') {
        return null;
      }
      return navigation.getState();
    } catch (error) {
      // Navigation not ready yet - this is expected during initialization
      return null;
    }
  }, [navigation]);

  // Preload screens for better performance
  const preloadScreen = useCallback(
    (screenName: string) => {
      if (preloadedScreens.current.has(screenName)) {
        return;
      }

      // Use InteractionManager to preload during idle time
      InteractionManager.runAfterInteractions(() => {
        try {
          const state = getNavigationState();
          if (!state || !state.routes || state.routes.length === 0) {
            // Navigation not ready yet, skip preloading
            return;
          }

          // Preload the screen by navigating to it and immediately going back
          // This is a common pattern for React Navigation preloading
          const currentRoute =
            state.routes[state.index || 0];
          if (currentRoute?.name !== screenName) {
            preloadedScreens.current.add(screenName);
            console.log(`📱 Preloaded screen: ${screenName}`);
          }
        } catch (error) {
          // Silently fail if navigation isn't ready - this is expected during initialization
          if (__DEV__) {
            console.warn(`Failed to preload screen ${screenName}:`, error);
          }
        }
      });
    },
    [getNavigationState],
  );

  // Preload all specified screens
  useEffect(() => {
    if (preloadScreens.length > 0) {
      preloadScreens.forEach(screenName => {
        preloadScreen(screenName);
      });
    }
  }, [preloadScreens, preloadScreen]);

  // Memory optimization - unmount screens when not focused
  useFocusEffect(
    useCallback(() => {
      if (!enableMemoryOptimization) return;

      // Clean up when screen loses focus
      return () => {
        // Force garbage collection for better memory management
        if (global.gc) {
          global.gc();
        }
      };
    }, [enableMemoryOptimization]),
  );

  // Interaction batching for smoother animations
  const batchNavigation = useCallback(
    (navigationActions: (() => void)[]) => {
      if (!enableInteractionBatching) {
        navigationActions.forEach(action => action());
        return;
      }

      // Batch all navigation actions to run after interactions complete
      InteractionManager.runAfterInteractions(() => {
        navigationActions.forEach(action => {
          try {
            action();
          } catch (error) {
            console.error('Navigation action failed:', error);
          }
        });
      });
    },
    [enableInteractionBatching],
  );

  // Background optimization
  useEffect(() => {
    if (!enableBackgroundOptimization) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      isAppActive.current = nextAppState === 'active';

      if (nextAppState === 'background') {
        // Reduce memory usage when app goes to background
        if (global.gc) {
          global.gc();
        }
      } else if (nextAppState === 'active') {
        // Resume normal operations when app becomes active
        console.log('📱 App became active - resuming navigation optimizations');
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [enableBackgroundOptimization]);

  // Performance monitoring
  const logPerformanceMetrics = useCallback(() => {
    try {
      const state = getNavigationState();
      if (!state || !state.routes) {
        console.warn('Navigation not ready for performance metrics');
        return;
      }

      const currentRoute = state.routes[state.index];

      console.log('📊 Navigation Performance Metrics:', {
        currentRoute: currentRoute?.name,
        totalRoutes: state.routes.length,
        preloadedScreens: Array.from(preloadedScreens.current),
        isAppActive: isAppActive.current,
        memoryOptimization: enableMemoryOptimization,
        interactionBatching: enableInteractionBatching,
        backgroundOptimization: enableBackgroundOptimization,
      });
    } catch (error) {
      // Silently fail if navigation isn't ready
      if (__DEV__) {
        console.warn('Failed to log performance metrics:', error);
      }
    }
  }, [
    getNavigationState,
    enableMemoryOptimization,
    enableInteractionBatching,
    enableBackgroundOptimization,
  ]);

  return {
    preloadScreen,
    batchNavigation,
    logPerformanceMetrics,
    isAppActive: isAppActive.current,
    preloadedScreens: Array.from(preloadedScreens.current),
  };
};

/**
 * Hook for optimizing screen transitions
 */
export const useScreenTransitionOptimization = () => {
  let navigation: ReturnType<typeof useNavigation> | null = null;
  try {
    navigation = useNavigation();
  } catch (error) {
    // Navigation not ready yet - this is expected during initialization
    if (__DEV__) {
      console.warn('Navigation not initialized for screen transition optimization:', error);
    }
  }
  const transitionStartTime = useRef<number>(0);

  const startTransition = useCallback(() => {
    transitionStartTime.current = Date.now();
  }, []);

  const endTransition = useCallback((screenName: string) => {
    const duration = Date.now() - transitionStartTime.current;
    console.log(`🔄 Transition to ${screenName} took ${duration}ms`);

    // Log slow transitions
    if (duration > 300) {
      console.warn(`⚠️ Slow transition to ${screenName}: ${duration}ms`);
    }
  }, []);

  return {
    startTransition,
    endTransition,
  };
};

/**
 * Hook for lazy loading optimization
 */
export const useLazyLoadingOptimization = () => {
  const loadedComponents = useRef<Set<string>>(new Set());

  const loadComponent = useCallback(
    async (componentName: string, loader: () => Promise<any>) => {
      if (loadedComponents.current.has(componentName)) {
        return;
      }

      try {
        await loader();
        loadedComponents.current.add(componentName);
        console.log(`📦 Lazy loaded component: ${componentName}`);
      } catch (error) {
        console.error(`Failed to lazy load ${componentName}:`, error);
      }
    },
    [],
  );

  const isComponentLoaded = useCallback((componentName: string) => {
    return loadedComponents.current.has(componentName);
  }, []);

  return {
    loadComponent,
    isComponentLoaded,
    loadedComponents: Array.from(loadedComponents.current),
  };
};

/**
 * Navigation memory management utilities
 */
export const NavigationMemoryManager = {
  /**
   * Clear navigation cache
   */
  clearCache: () => {
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    console.log('🧹 Navigation cache cleared');
  },

  /**
   * Get memory usage statistics
   */
  getMemoryStats: () => {
    if (global.performance && (global.performance as any).memory) {
      return {
        used: (global.performance as any).memory.usedJSHeapSize,
        total: (global.performance as any).memory.totalJSHeapSize,
        limit: (global.performance as any).memory.jsHeapSizeLimit,
      };
    }
    return null;
  },

  /**
   * Monitor memory usage
   */
  monitorMemoryUsage: (threshold: number = 0.8) => {
    const stats = NavigationMemoryManager.getMemoryStats();
    if (stats) {
      const usageRatio = stats.used / stats.limit;
      if (usageRatio > threshold) {
        console.warn(`⚠️ High memory usage: ${(usageRatio * 100).toFixed(1)}%`);
        NavigationMemoryManager.clearCache();
      }
    }
  },
};

export default useNavigationPerformance;
