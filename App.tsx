import React, { useCallback, useEffect, useState, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import {
  NavigationContainer,
  NavigationContainerRef,
  NavigationState,
  LinkingOptions,
} from '@react-navigation/native';
import { RootStackParamList } from './src/types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  QueryClient,
  QueryCache,
  useQueryErrorResetBoundary,
} from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useNotification } from './src/contexts/NotificationContext';
import { AppProviders } from './src/providers/AppProviders';
import { setNotificationTaskHandler } from './src/services/notifications';
import { OfflineBanner } from './src/shared/components/OfflineBanner';
import { SyncIndicator } from './src/shared/components/SyncIndicator';
import { revenueCatService } from './src/services/revenueCat';
import { analyticsService } from './src/services/analytics';
import { errorTracking } from './src/services/errorTracking';
import { Platform } from 'react-native';
import TaskDetailSheet from './src/shared/components/TaskDetailSheet';
import { AppNavigator } from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/theme';
import { useTheme } from './src/contexts/ThemeContext';
import AnimatedSplashScreen from './src/shared/screens/AnimatedSplashScreen';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from './src/services/notifications';
import notificationServiceNew from './src/services/notificationService';
import {
  handleNotificationAction,
  trackNotificationOpened,
} from './src/utils/notificationActions';
import { promptForUpdateIfNeeded } from './src/utils/apiVersionCheck';
import { GracePeriodChecker } from './src/components/GracePeriodChecker';
import { updateService } from './src/services/updateService';
import * as Notifications from 'expo-notifications';
import ErrorBoundary from './src/shared/components/ErrorBoundary';
import { updateLastActiveTimestamp } from './src/utils/sessionTimeout';
import { syncManager } from './src/services/syncManager';
import { useAppStateSync } from './src/hooks/useAppState';
import { navigationSyncService } from './src/services/navigationSync';
import { AUTHENTICATED_ROUTES } from './src/navigation/utils/RouteGuards';
import { validateAndLogConfig } from './src/utils/configValidator';
import {
  setupQueryCachePersistence,
  persistQueryCache,
} from './src/utils/queryCachePersistence';
import { AppState } from 'react-native';
import { Subscription } from 'expo-modules-core';
import { Task } from '@/types';
import { useCompleteTask, useDeleteTask } from '@/hooks/useTaskMutations';
import { createRetryDelayFunction } from './src/utils/retryConfig';

// Validate configuration on startup
validateAndLogConfig();

// Disable React Native DevTools overlay for non-technical users
if (__DEV__) {
  // Prevent DevTools from connecting and showing overlay
  if (typeof global !== 'undefined') {
    // Disable React DevTools
    (global as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;
    // Disable React Native DevTools
    if ((global as any).window) {
      (global as any).window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;
    }
    // Disable Element Inspector
    if ((global as any).__DEV__) {
      // Override DevTools setup
      const originalDevTools = (global as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (originalDevTools) {
        (global as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
          ...originalDevTools,
          onCommitFiberRoot: () => {},
          onCommitFiberUnmount: () => {},
        };
      }
    }
  }
  // Helper function to check if error is Metro symbolication error
  const isMetroSymbolicateError = (args: any[]): boolean => {
    // Check Error objects directly first (most reliable)
    for (const arg of args) {
      if (arg instanceof Error) {
        const errorName = arg.name || '';
        const errorMessage = arg.message || '';
        const errorStack = arg.stack || '';

        // Check if it's a SyntaxError about undefined JSON
        if (
          errorName === 'SyntaxError' &&
          (errorMessage.includes('undefined') ||
            errorMessage.includes('not valid JSON') ||
            errorMessage.includes('"undefined"'))
        ) {
          // Check if stack trace contains Metro symbolication references
          if (
            errorStack.includes('_symbolicate') ||
            errorStack.includes('metro/src/Server.js') ||
            errorStack.includes('Server._processRequest') ||
            errorStack.includes('Server._symbolicate') ||
            errorStack.includes('metro')
          ) {
            return true;
          }
        }
      }
      // Also check if arg is a string that matches the pattern
      if (typeof arg === 'string') {
        if (
          arg.includes('SyntaxError') &&
          (arg.includes('undefined') || arg.includes('not valid JSON')) &&
          (arg.includes('_symbolicate') ||
            arg.includes('metro/src/Server.js') ||
            arg.includes('Server._processRequest') ||
            arg.includes('metro'))
        ) {
          return true;
        }
      }
    }

    // Convert all args to strings for comprehensive pattern matching
    const allArgsAsString = args
      .map(arg => {
        try {
          if (arg instanceof Error) {
            return `${arg.name}: ${arg.message} ${arg.stack || ''}`;
          }
          if (typeof arg === 'object' && arg !== null) {
            return JSON.stringify(arg);
          }
          return String(arg);
        } catch {
          return String(arg);
        }
      })
      .join(' ');

    // More aggressive pattern matching for Metro errors
    // Match various forms of the error message
    const hasSyntaxError = allArgsAsString.includes('SyntaxError');
    const hasUndefinedJson =
      allArgsAsString.includes('undefined') ||
      allArgsAsString.includes('not valid JSON') ||
      allArgsAsString.includes('"undefined"');
    const hasMetroReference =
      allArgsAsString.includes('_symbolicate') ||
      allArgsAsString.includes('metro/src/Server.js') ||
      allArgsAsString.includes('Server._processRequest') ||
      allArgsAsString.includes('Server._symbolicate') ||
      allArgsAsString.includes('metro') ||
      allArgsAsString.includes('JSON.parse');

    return (
      (hasSyntaxError && hasUndefinedJson && hasMetroReference) ||
      (allArgsAsString.includes('JSON.parse') &&
        hasUndefinedJson &&
        (allArgsAsString.includes('metro') ||
          allArgsAsString.includes('Server')))
    );
  };

  // Disable console warnings about DevTools and Metro errors
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    // Suppress Metro symbolication errors in warnings too
    if (isMetroSymbolicateError(args)) {
      return;
    }
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('DevTools') ||
        args[0].includes('React DevTools') ||
        args[0].includes('Element Inspector'))
    ) {
      return; // Suppress DevTools warnings
    }
    originalWarn.apply(console, args);
  };

  // Suppress Metro bundler symbolication errors (harmless noise)
  const originalError = console.error;
  console.error = (...args: any[]) => {
    // Check if this is a Metro symbolication error
    if (isMetroSymbolicateError(args)) {
      return; // Suppress Metro symbolication errors
    }
    originalError.apply(console, args);
  };

  // Also intercept console.log to catch Metro errors logged there
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    // Suppress Metro symbolication errors in logs too
    if (isMetroSymbolicateError(args)) {
      return;
    }
    originalLog.apply(console, args);
  };

  // Patch Error.prototype.toJSON globally to prevent undefined values in serialization
  // This ensures Metro's symbolication process never encounters undefined when serializing errors
  if (typeof (Error.prototype as any).toJSON === 'undefined') {
    (Error.prototype as any).toJSON = function () {
      const obj: Record<string, any> = {
        name: this.name || 'Error',
        message: this.message || 'An error occurred',
      };

      // Only include stack if it exists
      if (this.stack) {
        obj.stack = this.stack;
      }

      // Include any enumerable properties, but filter out undefined
      for (const key in this) {
        if (this.hasOwnProperty(key)) {
          const value = (this as any)[key];
          if (value !== undefined) {
            try {
              // Only include serializable values
              JSON.stringify(value);
              obj[key] = value;
            } catch {
              // Skip non-serializable values
            }
          }
        }
      }

      return obj;
    };
  }

  // Disable dev menu's Element Inspector option
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    // This prevents the Element Inspector from being activated
    try {
      const DevSettings = require('react-native').DevSettings;
      if (DevSettings && DevSettings.setIsInspectorShown) {
        DevSettings.setIsInspectorShown(false);
      }
    } catch (e) {
      // DevSettings might not be available, ignore
    }
  }
}

// Initialize centralized error tracking service
errorTracking.initialize(Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_DSN);

// Initialize cache monitoring (only in production)
if (!__DEV__) {
  import('@/services/cacheMonitoring').then(({ cacheMonitoring }) => {
    cacheMonitoring.start();
  });
}

// Global unhandled promise rejection handler
// Send to error tracking service for monitoring in production
if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);

    // Send to error tracking service
    errorTracking.captureError(reason as Error, {
      tags: { type: 'unhandled_promise_rejection' },
      extra: { promise: String(promise) },
    });
  });
}

// Navigation ref needs to be accessible globally
const navigationRef = React.createRef<NavigationContainerRef<any>>();

// Helper function to safely navigate - checks if navigation is ready before navigating
const navigateIfReady = (
  screen: keyof RootStackParamList,
  params?: any,
): void => {
  if (navigationRef.current?.isReady()) {
    try {
      (navigationRef.current as any).navigate(screen, params);
    } catch (error) {
      console.error(`Navigation error to ${String(screen)}:`, error);
    }
  } else {
    if (__DEV__) {
      console.warn(
        `Navigation not ready - cannot navigate to ${String(screen)}. Navigation will be queued.`,
      );
    }
    // Queue navigation for when it becomes ready
    const checkInterval = setInterval(() => {
      if (navigationRef.current?.isReady()) {
        clearInterval(checkInterval);
        try {
          (navigationRef.current as any).navigate(screen, params);
        } catch (error) {
          console.error(`Queued navigation error to ${String(screen)}:`, error);
        }
      }
    }, 100);

    // Clear interval after 5 seconds to prevent infinite checking
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 5000);
  }
};

// Prevent auto-hide of splash until we're ready
SplashScreen.preventAutoHideAsync();

// Create a new instance of the QueryClient with optimized default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh for 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes - cache time (formerly cacheTime)
      retry: 3, // Retry failed requests up to 3 times
      retryDelay: createRetryDelayFunction('normal'), // Exponential backoff with jitter
      refetchOnWindowFocus: false, // Don't refetch when window regains focus (mobile doesn't need this)
      refetchOnReconnect: true, // Refetch when internet reconnects
      refetchOnMount: true, // Always refetch when component mounts
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Suppress expected permission errors for guest users
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isPermissionError =
        errorMessage.includes('permission denied') ||
        errorMessage.includes('permission denied for table');

      // Don't log expected permission errors (guest users can't access these tables)
      if (isPermissionError) {
        // Silently ignore - these are expected for guest users
        return;
      }

      // Log other React Query errors
      console.error('React Query error:', error, query);
      // You can also send this to Sentry or other error tracking services
      // Sentry.captureException(error, { tags: { queryKey: query.queryKey } });
    },
  }),
});

// Component to setup query cache persistence
// Using useEffect ensures it only runs once, even during Fast Refresh
// Disabled in development to avoid Fast Refresh issues
const QueryCacheSetup: React.FC<{ queryClient: QueryClient }> = ({
  queryClient,
}) => {
  useEffect(() => {
    // Skip cache persistence in development mode to avoid Fast Refresh issues
    if (__DEV__) {
      console.log('⚠️ Cache persistence disabled in development mode');
      return;
    }

    let cacheCleanup: (() => void) | null = null;
    let appStateSubscription: Subscription | null = null;

    try {
      // CRITICAL: Wrap setup in try-catch to catch any errors from React Query
      // This catches errors that might escape from setupQueryCachePersistence
      try {
        // Setup persistence - useEffect ensures this only runs once per mount
        cacheCleanup = setupQueryCachePersistence(queryClient);
      } catch (setupError: any) {
        // Catch React Query errors that might escape
        const errorMessage = setupError?.message || String(setupError);
        if (
          errorMessage.includes('already been configured') ||
          errorMessage.includes('.never') ||
          errorMessage.includes('.forever') ||
          errorMessage.includes('Caching has already been configured')
        ) {
          console.warn(
            '⚠️ Query cache persistence setup failed - already configured',
          );
          return; // Exit early, don't set up listeners
        }
        // Re-throw other errors
        throw setupError;
      }

      // Also persist when app goes to background
      appStateSubscription = AppState.addEventListener(
        'change',
        nextAppState => {
          if (nextAppState === 'background' || nextAppState === 'inactive') {
            persistQueryCache(queryClient).catch(console.error);
          }
        },
      );

      console.log('✅ Query cache persistence enabled');
    } catch (error) {
      console.warn('⚠️ Failed to setup query cache persistence:', error);
    }

    // Cleanup on unmount
    return () => {
      if (cacheCleanup) {
        cacheCleanup();
      }
      if (appStateSubscription) {
        appStateSubscription.remove();
      }
    };
    // Empty deps - queryClient is stable (created at module level), setup should only run once
    // The WeakMap guard in setupQueryCachePersistence prevents duplicate setups
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

// Component to handle navigation state saving with auth context
const NavigationStateHandler: React.FC = () => {
  const { user, session } = useAuth();

  useEffect(() => {
    // Update current user ID in navigationSyncService
    navigationSyncService.setUserId(user?.id);

    // Clear navigation state on logout
    if (!session && !user) {
      console.log(
        '🔒 NavigationSync: User logged out, clearing navigation state',
      );
      navigationSyncService.clearState();
      navigationSyncService.setUserId(undefined);
      return;
    }

    // When user changes and is logged in, save current state with userId
    if (navigationRef.current && session && user) {
      const currentState = navigationRef.current.getRootState();
      if (currentState) {
        navigationSyncService.saveState(currentState, user.id);
      }
    }
  }, [user?.id, session, user]);

  return null;
};

// Component to handle navigation state validation (must be inside AuthProvider)
// This component ensures the app never blocks indefinitely during startup.
// It always resolves with either a validated state or a safe fallback (null).
const NavigationStateValidator: React.FC<{
  initialNavigationState?: NavigationState;
  onStateValidated: (state: NavigationState | null) => void;
}> = ({ initialNavigationState, onStateValidated }) => {
  const { session, user, loading: authLoading } = useAuth();

  useEffect(() => {
    let isCancelled = false;
    let maxTimeoutId: NodeJS.Timeout | null = null;
    let validationTimeoutId: NodeJS.Timeout | null = null;

    console.log('🔍 [NavigationStateValidator] Effect triggered', {
      authLoading,
      hasSession: !!session,
      hasUser: !!user,
      hasInitialState: !!initialNavigationState,
    });

    const validateNavigationState = async () => {
      console.log('🚀 [NavigationStateValidator] Starting validation');
      // GUARANTEED EXIT: Maximum timeout ensures we always resolve
      // This is the final safety net - app will render after 3 seconds maximum
      maxTimeoutId = setTimeout(() => {
        if (isCancelled) return;
        console.warn(
          '⚠️ [NavigationStateValidator] Maximum timeout reached - proceeding with safe fallback',
        );
        onStateValidated(null);
      }, 3000); // 3 second absolute maximum

      try {
        // Wait for auth to finish loading, but with a hard limit
        // If auth is still loading after 1.5 seconds, proceed with current state
        // Note: If authLoading changes, the effect will re-run (it's in dependencies)
        if (authLoading) {
          let authTimedOut = false;
          await new Promise<void>(resolve => {
            if (isCancelled) {
              resolve();
              return;
            }

            const timeoutId = setTimeout(() => {
              console.warn(
                '⚠️ [NavigationStateValidator] Auth still loading after timeout - proceeding with current state',
              );
              authTimedOut = true;
              // FIX: Immediately call onStateValidated when auth times out
              // This prevents the app from getting stuck if there's an initialNavigationState
              if (!isCancelled) {
                if (maxTimeoutId) clearTimeout(maxTimeoutId);
                onStateValidated(null);
              }
              resolve();
            }, 1500); // 1.5 seconds max wait for auth

            // If component unmounts, cancel the wait
            // The effect cleanup will handle isCancelled
            // We resolve immediately if already cancelled
            if (isCancelled) {
              clearTimeout(timeoutId);
              resolve();
            }
          });
          
          // If we timed out and already called onStateValidated, return early
          if (authTimedOut || isCancelled) return;
        }

        // If we have a pre-loaded initial state, validate it
        if (initialNavigationState && !isCancelled) {
          try {
            const isAuthenticated = !!session;

            // Extract route name from initialNavigationState to check if it's authenticated
            const getRouteName = (state: NavigationState): string | null => {
              if (!state || !state.routes || state.routes.length === 0) {
                return null;
              }
              const currentRoute = state.routes[state.index || 0];
              if (!currentRoute) {
                return null;
              }
              // If this route has nested state, get the nested route name
              if (currentRoute.state && 'routes' in currentRoute.state) {
                return getRouteName(currentRoute.state as NavigationState);
              }
              return currentRoute.name || null;
            };

            const currentRoute = getRouteName(initialNavigationState);
            const authenticatedRoutes =
              AUTHENTICATED_ROUTES as readonly string[];

            // If user is not authenticated but saved state contains authenticated route, clear it
            if (
              !isAuthenticated &&
              currentRoute &&
              authenticatedRoutes.includes(currentRoute)
            ) {
              console.log(
                '🔒 [NavigationStateValidator] User not authenticated, clearing authenticated navigation state',
              );
              await navigationSyncService.clearState().catch(() => {
                // Ignore errors - we're clearing state anyway
              });
              if (isCancelled) return;
              if (maxTimeoutId) clearTimeout(maxTimeoutId);
              onStateValidated(null);
              return;
            }

            // Get safe initial state with timeout protection
            // This ensures we never wait indefinitely for navigation sync
            validationTimeoutId = setTimeout(() => {
              if (isCancelled) return;
              console.warn(
                '⚠️ [NavigationStateValidator] Navigation sync timeout - using safe fallback',
              );
              if (maxTimeoutId) clearTimeout(maxTimeoutId);
              onStateValidated(null);
            }, 1500); // 1.5 second timeout for navigation sync

            const safeState = await Promise.race([
              navigationSyncService.getSafeInitialState(
                isAuthenticated,
                false, // Don't pass authLoading - we've already waited
                user?.id,
              ),
              new Promise<NavigationState | null>(resolve => {
                setTimeout(() => resolve(null), 1500);
              }),
            ]);

            if (isCancelled) return;
            if (validationTimeoutId) clearTimeout(validationTimeoutId);
            if (maxTimeoutId) clearTimeout(maxTimeoutId);

            console.log(
              `✅ [NavigationStateValidator] Navigation state validated successfully`,
            );
            onStateValidated(safeState);
            return;
          } catch (error) {
            if (isCancelled) return;
            console.error(
              '❌ [NavigationStateValidator] Error validating initial state:',
              error,
            );
            // Clear state on error to prevent navigation errors
            await navigationSyncService.clearState().catch(() => {
              // Ignore errors during cleanup
            });
            if (validationTimeoutId) clearTimeout(validationTimeoutId);
            if (maxTimeoutId) clearTimeout(maxTimeoutId);
            onStateValidated(null);
            return;
          }
        }

        // No initial state to validate - proceed with default (null = default navigation)
        if (isCancelled) return;
        if (maxTimeoutId) clearTimeout(maxTimeoutId);
        console.log(
          '✅ [NavigationStateValidator] No initial state - using default navigation',
        );
        onStateValidated(null);
      } catch (error) {
        // Final catch-all - ensures we always resolve
        if (isCancelled) return;
        console.error(
          '❌ [NavigationStateValidator] Unexpected error during validation:',
          error,
        );
        if (validationTimeoutId) clearTimeout(validationTimeoutId);
        if (maxTimeoutId) clearTimeout(maxTimeoutId);
        onStateValidated(null);
      }
    };

    console.log('📞 [NavigationStateValidator] Calling validateNavigationState');
    validateNavigationState();

    // Cleanup function - prevents state updates if component unmounts
    return () => {
      console.log('🧹 [NavigationStateValidator] Cleanup - cancelling validation');
      isCancelled = true;
      if (maxTimeoutId) clearTimeout(maxTimeoutId);
      if (validationTimeoutId) clearTimeout(validationTimeoutId);
    };
  }, [
    authLoading,
    session,
    user?.id,
    initialNavigationState,
    // Note: onStateValidated is intentionally NOT in deps to prevent re-runs
    // It's stable from useCallback in parent component
  ]);

  return null;
};

// Deep linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['elaro://'],
  config: {
    screens: {
      // Main app screens
      Main: {
        screens: {
          Home: 'home',
          Account: 'account',
        },
      },
      // Task detail screens - handle different task types
      TaskDetailModal: {
        path: ':taskType/:taskId',
        parse: {
          taskId: (taskId: string) => taskId,
          taskType: (taskType: string) => {
            // Normalize task type for internal use
            if (taskType === 'study-session') return 'study_session';
            return taskType;
          },
        },
      },
      // Course screens
      CourseDetail: {
        path: 'course/:courseId',
        parse: {
          courseId: (courseId: string) => courseId,
        },
      },
      Courses: 'courses',
      Calendar: 'calendar',
      Profile: 'profile',
      Settings: 'settings',
      RecycleBin: 'recycle-bin',
      PaywallScreen: 'paywall',
      // Auth
      Auth: 'auth',
      ResetPassword: 'reset-password',
      // Onboarding
      OnboardingFlow: 'onboarding',
    },
  },
};

// Component to handle deep links from external sources
// Note: React Navigation's linking prop handles most deep links automatically,
// but this component handles edge cases and provides fallback navigation
const DeepLinkHandler: React.FC = () => {
  useEffect(() => {
    const { Linking } = require('react-native');
    const { parseDeepLink, isDeepLink } = require('@/utils/deepLinking');

    // Handle initial URL (if app was opened via deep link)
    // React Navigation's linking prop should handle this, but we add a fallback
    Linking.getInitialURL()
      .then((url: string | null) => {
        if (url && isDeepLink(url) && navigationRef.current) {
          const parsed = parseDeepLink(url);
          if (parsed?.screen) {
            // Use safe navigation helper
            const screen = parsed.screen as keyof RootStackParamList;
            const params = parsed.params as RootStackParamList[typeof screen];
            navigateIfReady(screen, params);
          }
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to get initial URL:', error);
      });

    // Listen for deep links while app is running
    // React Navigation's linking prop handles this, but we add a listener for edge cases
    const subscription = Linking.addEventListener(
      'url',
      ({ url }: { url: string }) => {
        if (isDeepLink(url) && navigationRef.current) {
          const parsed = parseDeepLink(url);
          if (parsed?.screen) {
            const screen = parsed.screen as keyof RootStackParamList;
            const params = parsed.params as RootStackParamList[typeof screen];
            navigateIfReady(screen, params);
          }
        }
      },
    );

    return () => subscription.remove();
  }, []);

  return null;
};

// Component to integrate React Query with Error Boundary
const AppWithErrorBoundary: React.FC<{
  initialNavigationState?: NavigationState;
}> = ({ initialNavigationState }) => {
  const { reset } = useQueryErrorResetBoundary();
  const [safeInitialState, setSafeInitialState] =
    useState<NavigationState | null>(null);
  const [isStateValidated, setIsStateValidated] = useState(false);
  const [navigationContainerMounted, setNavigationContainerMounted] =
    useState(false);
  const [appInitializerState, setAppInitializerState] = useState<{
    appIsReady: boolean;
    isAnimationFinished: boolean;
  }>({
    appIsReady: false,
    isAnimationFinished: false,
  });

  // Sync auth state on app resume
  useAppStateSync();

  const handleStateValidated = useCallback((state: NavigationState | null) => {
    console.log('✅ [AppWithErrorBoundary] handleStateValidated called', {
      hasState: !!state,
      stateType: state ? typeof state : 'null',
    });
    setSafeInitialState(state);
    setIsStateValidated(true);
  }, []);

  const handleAppInitializerStateChange = useCallback(
    (state: { appIsReady: boolean; isAnimationFinished: boolean }) => {
      console.log(
        '📱 [AppWithErrorBoundary] AppInitializer state changed:',
        state,
      );
      setAppInitializerState(state);
    },
    [],
  );

  const { appIsReady, isAnimationFinished } = appInitializerState;

  // Debug: Track when isStateValidated changes
  useEffect(() => {
    console.log('🔍 [AppWithErrorBoundary] isStateValidated changed:', {
      isStateValidated,
      shouldShowLoading: !isStateValidated,
      appIsReady,
      isAnimationFinished,
    });
  }, [isStateValidated, appIsReady, isAnimationFinished]);

  // Hide native splash screen ONLY when ALL conditions are met:
  // 1. appIsReady === true
  // 2. isAnimationFinished === true
  // 3. isStateValidated === true
  // 4. NavigationContainer has mounted (shouldShowLoading === false AND onReady fired OR fallback timeout)
  const hasHiddenSplashRef = useRef(false);
  const navigationContainerRenderTimeRef = useRef<number | null>(null);

  // Track when NavigationContainer starts rendering
  useEffect(() => {
    if (
      !shouldShowLoading &&
      navigationContainerRenderTimeRef.current === null
    ) {
      navigationContainerRenderTimeRef.current = Date.now();
    }
  }, [shouldShowLoading]);

  useEffect(() => {
    // Check if NavigationContainer is rendered (even if onReady hasn't fired yet)
    const navigationContainerRendered = !shouldShowLoading;

    // If NavigationContainer has been rendered for more than 500ms, assume it's mounted
    const navigationContainerMountedOrTimedOut =
      navigationContainerMounted ||
      (navigationContainerRendered &&
        navigationContainerRenderTimeRef.current !== null &&
        Date.now() - navigationContainerRenderTimeRef.current > 500);

    // Check if all conditions are met
    const allConditionsMet =
      appIsReady &&
      isAnimationFinished &&
      isStateValidated &&
      navigationContainerRendered &&
      navigationContainerMountedOrTimedOut;

    // Log current state for debugging
    if (__DEV__) {
      console.log('🔍 [AppWithErrorBoundary] Splash hide conditions check:', {
        appIsReady,
        isAnimationFinished,
        isStateValidated,
        navigationContainerRendered,
        navigationContainerMounted,
        navigationContainerMountedOrTimedOut,
        allConditionsMet,
        hasHiddenSplash: hasHiddenSplashRef.current,
      });
    }

    if (allConditionsMet && !hasHiddenSplashRef.current) {
      hasHiddenSplashRef.current = true;
      console.log(
        '✅ [AppWithErrorBoundary] All conditions met - hiding native splash',
        {
          appIsReady,
          isAnimationFinished,
          isStateValidated,
          navigationContainerRendered,
          navigationContainerMounted,
        },
      );
      SplashScreen.hideAsync().catch(error => {
        console.error('❌ Failed to hide splash screen:', error);
        // Don't throw - app can continue
      });
    }
  }, [
    appIsReady,
    isAnimationFinished,
    isStateValidated,
    shouldShowLoading,
    navigationContainerMounted,
  ]);

  // Fallback: Force hide splash after 6 seconds maximum (safety net)
  useEffect(() => {
    const fallbackSplashTimeout = setTimeout(() => {
      if (!hasHiddenSplashRef.current) {
        console.warn(
          '⚠️ [AppWithErrorBoundary] Splash screen fallback timeout - forcing hide',
          {
            appIsReady,
            isAnimationFinished,
            isStateValidated,
            shouldShowLoading,
            navigationContainerMounted,
          },
        );
        hasHiddenSplashRef.current = true;
        SplashScreen.hideAsync().catch(error => {
          console.error('❌ Failed to hide splash screen (fallback):', error);
        });
      }
    }, 6000); // 6 second absolute maximum

    return () => clearTimeout(fallbackSplashTimeout);
  }, [
    appIsReady,
    isAnimationFinished,
    isStateValidated,
    shouldShowLoading,
    navigationContainerMounted,
  ]);

  // Defensive fallback: NavigationStateValidator guarantees resolution within 3 seconds,
  // but this provides a final safety net (5 seconds) in case of unexpected issues
  useEffect(() => {
    // IMMEDIATE FALLBACK: Force validation after 2 seconds if still stuck
    // This helps debug and ensures the app doesn't stay on white screen
    const immediateFallback = setTimeout(() => {
      if (!isStateValidated) {
        console.warn(
          '⚠️ [AppWithErrorBoundary] Immediate fallback triggered (2s) - forcing render to prevent white screen',
          {
            appIsReady,
            isAnimationFinished,
            shouldShowLoading,
          },
        );
        setIsStateValidated(true);
        setSafeInitialState(null);
      }
    }, 2000); // 2 second immediate fallback

    // EXISTING FALLBACK: 5 second final safety net
    const fallbackTimeout = setTimeout(() => {
      if (!isStateValidated) {
        console.error(
          '❌ [AppWithErrorBoundary] Navigation state validation did not complete within expected time - forcing render',
        );
        setIsStateValidated(true);
        setSafeInitialState(null);
      }
    }, 5000); // 5 second final safety net (NavigationStateValidator max is 3s)

    return () => {
      clearTimeout(immediateFallback);
      clearTimeout(fallbackTimeout);
    };
  }, [isStateValidated, appIsReady, isAnimationFinished, shouldShowLoading]);

  // Don't render NavigationContainer until navigation state validation is complete
  // Note: NavigationStateValidator (inside AppProviders) handles auth loading check
  const shouldShowLoading = !isStateValidated;

  return (
    <ErrorBoundary onReset={reset}>
      <AppProviders queryClient={queryClient}>
        {!__DEV__ && <QueryCacheSetup queryClient={queryClient} />}
        <AppInitializer onStateChange={handleAppInitializerStateChange}>
          {shouldShowLoading ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: COLORS.background,
              }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <NavigationStateValidator
                initialNavigationState={initialNavigationState}
                onStateValidated={handleStateValidated}
              />
            </View>
          ) : (
            <>
              <ThemedStatusBar />
              <NavigationContainer
                ref={navigationRef}
                initialState={safeInitialState ?? undefined}
                linking={linking}
                onReady={() => {
                  // Mark NavigationContainer as mounted
                  setNavigationContainerMounted(true);
                }}
                onStateChange={async state => {
                  // Update last active timestamp whenever user navigates
                  await updateLastActiveTimestamp();

                  // Save navigation state using navigationSyncService
                  // User ID will be set via NavigationStateHandler component
                  await navigationSyncService.saveState(state);
                }}>
                <DeepLinkHandler />
                <NavigationStateHandler />
                <GracePeriodChecker />
                <AuthEffects />
                {/* Offline Support UI Indicators */}
                <OfflineBanner />
                <SyncIndicator />
                <AppNavigator />
                <NotificationHandler />
                {/* DevTools Disabler - prevents overlay from appearing */}
                {__DEV__ && <DevToolsDisabler />}
              </NavigationContainer>
            </>
          )}
        </AppInitializer>
      </AppProviders>
    </ErrorBoundary>
  );
};

// App Initializer Component for handling async setup
const AppInitializer: React.FC<{
  children: React.ReactNode;
  onStateChange?: (state: {
    appIsReady: boolean;
    isAnimationFinished: boolean;
  }) => void;
}> = ({ children, onStateChange }) => {
  const [appIsReady, setAppIsReady] = useState(false);
  const [isAnimationFinished, setAnimationFinished] = useState(false);

  // Notify parent when state changes
  useEffect(() => {
    if (onStateChange) {
      console.log('📱 [AppInitializer] State changed, notifying parent:', {
        appIsReady,
        isAnimationFinished,
      });
      onStateChange({ appIsReady, isAnimationFinished });
    }
  }, [appIsReady, isAnimationFinished, onStateChange]);

  // Add safety timeout - force show app after 3 seconds max
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (!appIsReady || !isAnimationFinished) {
        console.warn('⚠️ App initialization timeout - forcing app to show');
        setAppIsReady(true);
        setAnimationFinished(true);
      }
    }, 3000); // 3 second max timeout

    return () => clearTimeout(safetyTimeout);
  }, []);

  useEffect(() => {
    const prepare = async () => {
      try {
        // Set a minimum display time for splash (500ms) for better UX
        // Reduced from 800ms for faster perceived startup
        const minSplashTime = Promise.resolve().then(
          () => new Promise(resolve => setTimeout(resolve, 500)),
        );

        // RevenueCat - Initialize in background, don't wait for it
        // This prevents blocking app startup if RevenueCat is slow or misconfigured
        (async () => {
          try {
            const revenueCatApiKey =
              Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;

            if (revenueCatApiKey) {
              // Add timeout to prevent hanging
              try {
                const initTimeout = new Promise<boolean>((_, reject) => {
                  setTimeout(
                    () => reject(new Error('RevenueCat init timeout')),
                    3000,
                  );
                });

                const initPromise =
                  revenueCatService.initialize(revenueCatApiKey);
                let initSuccess = false;

                try {
                  initSuccess = await Promise.race([initPromise, initTimeout]);
                } catch (raceError) {
                  // Timeout or error occurred - silently continue (non-blocking)
                  // Don't show error to user - app can function without RevenueCat
                  if (__DEV__) {
                    const errorMsg =
                      raceError instanceof Error
                        ? raceError.message
                        : 'Unknown error';
                    console.warn(
                      '⚠️ RevenueCat initialization failed (non-blocking):',
                      errorMsg,
                    );
                  }
                  return; // Exit early on error - app continues without RevenueCat
                }

                if (initSuccess) {
                  if (__DEV__) {
                    console.log('✅ RevenueCat initialized');
                  }
                  // Verification can happen in background - don't block
                  import('./src/config/verifyRevenuecat')
                    .then(({ verifyRevenueCatSetup }) => {
                      // Add timeout for verification too
                      const verifyTimeout = new Promise<boolean>(
                        (_, reject) => {
                          setTimeout(
                            () => reject(new Error('Verification timeout')),
                            2000,
                          );
                        },
                      );
                      return Promise.race([
                        verifyRevenueCatSetup(),
                        verifyTimeout,
                      ]);
                    })
                    .then(verified => {
                      if (verified && __DEV__) {
                        console.log('✅ RevenueCat setup verified');
                      }
                    })
                    .catch(verifyError => {
                      // Silently fail in dev, only log in production if critical
                      if (!__DEV__) {
                        errorTracking.captureError(verifyError as Error, {
                          tags: {
                            component: 'revenuecat',
                            phase: 'verification',
                          },
                        });
                      }
                    });
                } else if (__DEV__) {
                  console.warn(
                    '⚠️ RevenueCat initialization failed - subscription features disabled',
                  );
                }
              } catch (initError) {
                // Timeout or initialization error - silently continue (non-blocking)
                // Don't show error to user - app can function without RevenueCat
                if (__DEV__) {
                  const errorMsg =
                    initError instanceof Error
                      ? initError.message
                      : 'Unknown error';
                  console.warn(
                    '⚠️ RevenueCat initialization failed (non-blocking):',
                    errorMsg,
                  );
                }
              }
            } else if (__DEV__) {
              console.warn(
                '⚠️ RevenueCat API key not found - subscription features disabled',
              );
            }
          } catch (error) {
            // Only log errors in dev mode to reduce noise
            if (__DEV__) {
              console.warn('⚠️ RevenueCat init failed (non-blocking):', error);
            }
            // Still track errors in production for monitoring
            if (!__DEV__) {
              errorTracking.captureError(error as Error, {
                tags: { component: 'revenuecat', phase: 'initialization' },
              });
            }
          }
        })();

        // Sync Manager - make truly non-blocking with timeout
        // Don't block app startup - sync manager can initialize in background
        const syncManagerInit = Promise.race([
          syncManager.start().then(() => {
            if (__DEV__) {
              console.log('✅ Sync Manager initialized');
            }
          }),
          new Promise<void>(resolve => {
            setTimeout(() => {
              if (__DEV__) {
                console.warn(
                  '⚠️ SyncManager init timeout - continuing without it',
                );
              }
              resolve();
            }, 2000); // 2 second timeout - don't block app startup
          }),
        ]).catch(error => {
          if (__DEV__) {
            console.warn('⚠️ Sync Manager init failed (non-blocking):', error);
          }
          // Continue anyway - sync manager can start later
        });

        // Initialize circuit breaker monitoring (non-blocking)
        import('./src/utils/circuitBreakerMonitor')
          .then(({ startCircuitBreakerMonitoring }) => {
            startCircuitBreakerMonitoring(30000); // Check every 30 seconds
            if (__DEV__) {
              console.log('✅ Circuit breaker monitoring initialized');
            }
          })
          .catch(console.error);

        // Track bundle size (non-blocking)
        import('./src/services/bundleSizeTracking').then(
          ({ trackBundleSize }) => {
            trackBundleSize().catch(console.error);
          },
        );

        // Only wait for minimum splash time - don't wait for sync manager
        // Sync manager will initialize in background and won't block app startup
        await minSplashTime;
      } catch (e) {
        console.error('❌ App initialization error:', e);
        errorTracking.captureError(e as Error, {
          tags: { component: 'app', phase: 'initialization' },
        });
        // Don't block app startup - continue with degraded functionality
      } finally {
        setAppIsReady(true);
      }
    };

    prepare();
  }, []);

  // REMOVED: SplashScreen.hideAsync() - now called only when app is fully ready
  // See AppWithErrorBoundary for the proper lifecycle management

  // Add timeout to force animation finish if it doesn't complete
  useEffect(() => {
    const animationTimeout = setTimeout(() => {
      if (!isAnimationFinished) {
        console.warn('⚠️ Animation timeout - forcing finish');
        setAnimationFinished(true);
      }
    }, 2000); // 2 second timeout for animation

    return () => clearTimeout(animationTimeout);
  }, [isAnimationFinished]);

  const onLayoutRootView = useCallback(async () => {
    // Layout callback - no longer needed for splash hiding
  }, []);

  // Show splash screen immediately while initialization happens
  if (!appIsReady || !isAnimationFinished) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.primary }}>
        <AnimatedSplashScreen
          onAnimationFinish={() => {
            // Mark animation as finished (will be checked when app is ready)
            setAnimationFinished(true);
          }}
        />
      </View>
    );
  }

  // Once BOTH the app is ready AND the animation is finished, show the main navigator.
  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>{children}</SafeAreaProvider>
  );
};

// Component to actively disable DevTools overlay
const DevToolsDisabler: React.FC = () => {
  useEffect(() => {
    // Continuously check and disable DevTools overlay
    const interval = setInterval(() => {
      if (typeof global !== 'undefined') {
        // Disable React DevTools hook
        (global as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;

        // Try to close any active inspector
        try {
          const DevSettings = require('react-native').DevSettings;
          if (DevSettings && DevSettings.setIsInspectorShown) {
            DevSettings.setIsInspectorShown(false);
          }
        } catch (e) {
          // Ignore if DevSettings not available
        }
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  return null; // This component doesn't render anything
};

// StatusBar with theme support
const ThemedStatusBar = () => {
  const { isDark } = useTheme();
  return (
    <StatusBar
      style={isDark ? 'light' : 'dark'}
      backgroundColor={isDark ? '#1C1C1E' : '#FFFFFF'}
    />
  );
};

// Main App Component
// Move this logic into a child component
function AuthEffects() {
  const { user } = useAuth();

  useEffect(() => {
    const setupNotifications = async () => {
      if (user && user.id) {
        notificationService.initialize(user.id);

        // Setup notification categories and channels
        await notificationServiceNew.setupNotificationCategories();
        await notificationServiceNew.setupAndroidChannels();

        // Initialize Analytics with user ID
        analyticsService.identifyUser(user.id);

        // Track user login
        analyticsService.track('User Logged In', {
          user_id: user.id,
          subscription_tier: user.subscription_tier || 'free',
          onboarding_completed: user.onboarding_completed || false,
          timestamp: new Date().toISOString(),
        });

        // Data fetching is now handled by React Query hooks in individual components
      }
    };

    setupNotifications();
  }, [user]);

  return null;
}

// Component to handle notification context and TaskDetailSheet
function NotificationHandler() {
  const { taskToShow, setTaskToShow } = useNotification();
  const completeTaskMutation = useCompleteTask();
  const deleteTaskMutation = useDeleteTask();

  // Set up the handler so the notification service can call our context function
  useEffect(() => {
    setNotificationTaskHandler(setTaskToShow);
  }, [setTaskToShow]);

  // Setup notification action listener
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      response => {
        const actionIdentifier = response.actionIdentifier;

        // Track notification opened
        const reminderId = response.notification.request.content.data
          ?.reminderId as string | undefined;
        if (reminderId) {
          trackNotificationOpened(
            response.notification.request.identifier,
            reminderId,
          );
        }

        // Handle action if present
        if (
          actionIdentifier &&
          actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
        ) {
          handleNotificationAction(actionIdentifier, response.notification);
        }
      },
    );

    return () => subscription.remove();
  }, []);

  // Create handlers for the TaskDetailSheet
  const handleCloseSheet = () => setTaskToShow(null);

  const handleEditTask = (task: Task) => {
    // Close the sheet first
    setTaskToShow(null);

    // Navigate to edit modal using navigation ref
    if (navigationRef.current && task) {
      let modalName:
        | 'AddLectureFlow'
        | 'AddAssignmentFlow'
        | 'AddStudySessionFlow';

      switch (task.type) {
        case 'lecture':
          modalName = 'AddLectureFlow';
          break;
        case 'assignment':
          modalName = 'AddAssignmentFlow';
          break;
        case 'study_session':
          modalName = 'AddStudySessionFlow';
          break;
        default:
          console.warn('Unknown task type for editing:', task.type);
          return;
      }

      navigateIfReady(modalName, {
        initialData: { taskToEdit: task },
      });
    }
  };

  const handleCompleteTask = async (task: Task) => {
    if (!task) return;

    try {
      await completeTaskMutation.mutateAsync({
        taskId: task.id,
        taskType: task.type,
        taskTitle: task.title || task.name || 'Untitled Task',
      });
      setTaskToShow(null);
    } catch (error) {
      console.error('Error completing task:', error);
      // Don't close sheet on error so user can try again
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!task) return;

    try {
      await deleteTaskMutation.mutateAsync({
        taskId: task.id,
        taskType: task.type,
        taskTitle: task.title || task.name || 'Untitled Task',
      });
      setTaskToShow(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      // Don't close sheet on error so user can try again
    }
  };

  return (
    <TaskDetailSheet
      task={taskToShow}
      isVisible={!!taskToShow}
      onClose={handleCloseSheet}
      onEdit={handleEditTask}
      onComplete={handleCompleteTask}
      onDelete={handleDeleteTask}
    />
  );
}

function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialNavigationState, setInitialNavigationState] = useState<
    NavigationState | undefined
  >();

  useEffect(() => {
    const initializeApp = async () => {
      const startTime = performance.now();

      try {
        console.log('🚀 Starting app initialization...');

        const projectToken =
          Constants.expoConfig?.extra?.EXPO_PUBLIC_MIXPANEL_TOKEN;

        // Parallelize independent operations for faster startup (all non-blocking)
        Promise.allSettled([
          // Initialize Analytics (non-blocking)
          analyticsService.initialize(projectToken || '').then(() => {
            // Track app launch only after successful initialization
            analyticsService.track('App Launched', {
              platform: Platform.OS,
              timestamp: new Date().toISOString(),
              app_version: '1.0.0',
            });
            console.log('✅ Analytics initialized');
          }),

          // Check API version compatibility (non-blocking, don't fail if it fails)
          promptForUpdateIfNeeded()
            .then(() => {
              console.log('✅ API version check complete');
            })
            .catch(error => {
              console.warn('⚠️ API version check failed:', error);
            }),

          // Load navigation state (non-blocking)
          navigationSyncService
            .loadState()
            .then(state => {
              if (state) {
                setInitialNavigationState(state);
                console.log(
                  '✅ Navigation state loaded, will validate after auth loads',
                );
              }
            })
            .catch(error => {
              console.warn('⚠️ Navigation state restoration failed:', error);
            }),
        ]).catch(error => {
          console.warn('⚠️ Some app initialization tasks failed:', error);
        });

        // Check for updates (non-blocking, auto-installs)
        if (!__DEV__) {
          updateService.checkAndInstallUpdates().catch(error => {
            console.warn('Update check failed:', error);
          });
        }

        const endTime = performance.now();
        const initializationTime = endTime - startTime;
        console.log(
          `⏱️ App initialization started in ${initializationTime.toFixed(2)}ms (running in background)`,
        );
      } catch (error) {
        console.error('❌ Failed to start app initialization:', error);
      } finally {
        // Mark as ready immediately - initialization runs in background
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  // Set navigation reference in notification service when ready
  useEffect(() => {
    if (isReady && navigationRef.current) {
      notificationService.setNavigationRef(navigationRef.current);
    }
  }, [isReady]);

  // Show app immediately - initialization runs in background
  return (
    <AppWithErrorBoundary initialNavigationState={initialNavigationState} />
  );
}

export default App;
