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
import { validateAndLogConfig } from './src/utils/configValidator';
import { setupQueryCachePersistence } from './src/utils/queryCachePersistence';
import { AppState } from 'react-native';
import { Subscription } from 'expo-modules-core';
import { Task } from '@/types';
import { useCompleteTask, useDeleteTask } from '@/hooks/useTaskMutations';
import { createRetryDelayFunction } from './src/utils/retryConfig';
import { validateSupabaseConfig } from '@/services/supabase';

// Validate configuration on startup
validateAndLogConfig();

// Validate Supabase configuration before initializing services
try {
  validateSupabaseConfig();
  console.log('✅ Supabase configuration validated');
} catch (error) {
  console.error('❌ Supabase configuration error:', error);
  if (__DEV__) {
    // Fail fast in development
    throw error;
  }
  // In production, log error but continue (app will handle gracefully)
}

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
  // Disable console warnings about DevTools
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
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

// Setup query cache persistence
let cacheCleanup: (() => void) | null = null;
let appStateSubscription: Subscription | null = null;

// Setup persistence after QueryClient is created
try {
  cacheCleanup = setupQueryCachePersistence(queryClient);

  // Also persist when app goes to background
  appStateSubscription = AppState.addEventListener('change', nextAppState => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // Import dynamically to avoid circular dependency
      import('./src/utils/queryCachePersistence').then(
        ({ persistQueryCache }) => {
          persistQueryCache(queryClient).catch(console.error);
        },
      );
    }
  });

  console.log('✅ Query cache persistence enabled');
} catch (error) {
  console.warn('⚠️ Failed to setup query cache persistence:', error);
}

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
const NavigationStateValidator: React.FC<{
  initialNavigationState?: NavigationState;
  onStateValidated: (state: NavigationState | null) => void;
}> = ({ initialNavigationState, onStateValidated }) => {
  const { session, user, loading: authLoading } = useAuth();

  useEffect(() => {
    const validateNavigationState = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      // If we have a pre-loaded initial state, validate it
      if (initialNavigationState) {
        try {
          const safeState = await navigationSyncService.getSafeInitialState(
            !!session,
            authLoading,
            user?.id,
          );
          onStateValidated(safeState);
        } catch (error) {
          console.error(
            '❌ NavigationSync: Error validating initial state:',
            error,
          );
          onStateValidated(null);
        }
      } else {
        // No initial state to validate
        onStateValidated(null);
      }
    };

    validateNavigationState();
  }, [
    authLoading,
    session,
    user?.id,
    initialNavigationState,
    onStateValidated,
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
      // Guest
      GuestHome: 'guest',
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
      .then(url => {
        if (url && isDeepLink(url) && navigationRef.current) {
          const parsed = parseDeepLink(url);
          if (parsed?.screen) {
            // Wait a bit for navigation to be ready
            setTimeout(() => {
              if (navigationRef.current) {
                try {
                  navigationRef.current.navigate(
                    parsed.screen as keyof RootStackParamList,
                    parsed.params as any,
                  );
                } catch (error) {
                  console.error('Failed to navigate from deep link:', error);
                }
              }
            }, 1000);
          }
        }
      })
      .catch(error => {
        console.error('Failed to get initial URL:', error);
      });

    // Listen for deep links while app is running
    // React Navigation's linking prop handles this, but we add a listener for edge cases
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (isDeepLink(url) && navigationRef.current) {
        const parsed = parseDeepLink(url);
        if (parsed?.screen) {
          try {
            navigationRef.current.navigate(
              parsed.screen as keyof RootStackParamList,
              parsed.params as any,
            );
          } catch (error) {
            console.error('Failed to navigate from deep link:', error);
          }
        }
      }
    });

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

  // Sync auth state on app resume
  useAppStateSync();

  const handleStateValidated = useCallback((state: NavigationState | null) => {
    setSafeInitialState(state);
    setIsStateValidated(true);
  }, []);

  // Don't render NavigationContainer until navigation state validation is complete
  // Note: NavigationStateValidator (inside AppProviders) handles auth loading check
  const shouldShowLoading = !isStateValidated;

  return (
    <ErrorBoundary onReset={reset}>
      <AppProviders queryClient={queryClient}>
        <AppInitializer>
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
                initialState={safeInitialState}
                linking={linking}
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
const AppInitializer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [appIsReady, setAppIsReady] = useState(false);
  const [isAnimationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        // Initialize RevenueCat
        const revenueCatApiKey =
          Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
        if (revenueCatApiKey) {
          const initSuccess =
            await revenueCatService.initialize(revenueCatApiKey);

          // Verify RevenueCat setup only if initialization succeeded
          if (initSuccess) {
            const { verifyRevenueCatSetup } = await import(
              './src/config/verifyRevenuecat'
            );
            await verifyRevenueCatSetup();
          } else {
            console.warn(
              '⚠️ RevenueCat initialization failed. Skipping verification.',
            );
          }
        } else {
          console.warn(
            '⚠️ RevenueCat API key not found in environment variables',
          );
        }

        // Initialize Sync Manager for offline support
        console.log('🔄 Initializing Sync Manager...');
        await syncManager.start();
        console.log('✅ Sync Manager initialized');

        // Initialize circuit breaker monitoring
        import('./src/utils/circuitBreakerMonitor')
          .then(({ startCircuitBreakerMonitoring }) => {
            startCircuitBreakerMonitoring(30000); // Check every 30 seconds
            console.log('✅ Circuit breaker monitoring initialized');
          })
          .catch(console.error);

        // Track bundle size (non-blocking)
        import('./src/services/bundleSizeTracking').then(
          ({ trackBundleSize }) => {
            trackBundleSize().catch(console.error);
          },
        );

        // Future async initialization can go here:
        // - Load custom fonts
        // - Check for app updates
        // - Load user preferences
        // - Initialize push notifications
        // - Check onboarding status

        // Small delay to ensure smooth transition
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.warn('App initialization error:', e);
        // You could log this to your error tracking service
      } finally {
        setAppIsReady(true);
      }
    };

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Hide the native splash screen to reveal our animated splash screen
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    // While the app is preparing (fonts, auth state), we show nothing.
    // The native splash screen is still visible at this point.
    return null;
  }

  // Once the app is ready, we decide whether to show the animation or the main app.
  if (!isAnimationFinished) {
    // If the app is ready but the animation isn't finished, show the animated splash screen.
    return (
      <AnimatedSplashScreen
        onAnimationFinish={() => setAnimationFinished(true)}
      />
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

      try {
        navigationRef.current.navigate(modalName, {
          initialData: { taskToEdit: task },
        });
      } catch (error) {
        console.error('Error navigating to edit screen:', error);
      }
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

        // Parallelize independent operations for faster startup
        const [analyticsInit, versionCheck, navState] =
          await Promise.allSettled([
            // Initialize Analytics (non-blocking)
            analyticsService.initialize(projectToken || '').then(() => {
              // Track app launch only after successful initialization
              analyticsService.track('App Launched', {
                platform: Platform.OS,
                timestamp: new Date().toISOString(),
                app_version: '1.0.0',
              });
            }),

            // Check API version compatibility (non-blocking, don't fail if it fails)
            promptForUpdateIfNeeded().catch(error => {
              console.warn('⚠️ API version check failed:', error);
              return null; // Don't block startup
            }),

            // Load navigation state (non-blocking)
            navigationSyncService.loadState().catch(error => {
              console.error('❌ Failed to load navigation state:', error);
              return null; // Continue without restored state
            }),
          ]);

        // Handle analytics initialization result
        if (analyticsInit.status === 'fulfilled') {
          console.log('✅ Analytics initialized');
        } else {
          console.warn(
            '⚠️ Analytics initialization failed:',
            analyticsInit.reason,
          );
        }

        // Handle version check result
        if (
          versionCheck.status === 'fulfilled' &&
          versionCheck.value !== null
        ) {
          console.log('✅ API version check complete');
        }

        // Handle navigation state result
        if (navState.status === 'fulfilled' && navState.value) {
          setInitialNavigationState(navState.value);
          console.log(
            '✅ Navigation state loaded, will validate after auth loads',
          );
        } else if (navState.status === 'rejected') {
          // Log error but don't block app startup
          console.warn(
            '⚠️ Navigation state restoration failed:',
            navState.reason,
          );
          // Could optionally show a toast: "Could not restore previous screen"
          // For now, we'll continue without restored state
        }

        const endTime = performance.now();
        const initializationTime = endTime - startTime;
        console.log(
          `⏱️ App initialization completed in ${initializationTime.toFixed(2)}ms`,
        );

        // Check for updates (non-blocking, auto-installs)
        if (!__DEV__) {
          updateService.checkAndInstallUpdates().catch(error => {
            console.warn('Update check failed:', error);
            // Don't block app startup if update check fails
          });
        }
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
      } finally {
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

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: COLORS.background,
        }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <AppWithErrorBoundary initialNavigationState={initialNavigationState} />
  );
}

export default App;
