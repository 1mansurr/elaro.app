import React, { useCallback, useEffect, useState, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider, QueryCache, useQueryErrorResetBoundary } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { AuthProvider } from './src/features/auth/contexts/AuthContext';
import { SoftLaunchProvider } from './src/contexts/SoftLaunchContext';
import { NotificationProvider, useNotification } from './src/contexts/NotificationContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { ToastProvider } from './src/contexts/ToastContext';
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
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import AnimatedSplashScreen from './src/shared/screens/AnimatedSplashScreen';
import { useAuth } from './src/features/auth/contexts/AuthContext';
import { notificationService } from './src/services/notifications';
import notificationServiceNew from './src/services/notificationService';
import { handleNotificationAction, trackNotificationOpened } from './src/utils/notificationActions';
import { promptForUpdateIfNeeded } from './src/utils/apiVersionCheck';
import { GracePeriodChecker } from './src/components/GracePeriodChecker';
import * as Notifications from 'expo-notifications';
import ErrorBoundary from './src/shared/components/ErrorBoundary';
import { updateLastActiveTimestamp } from './src/utils/sessionTimeout';
import { syncManager } from './src/services/syncManager';
import { useAppStateSync } from './src/hooks/useAppState';
import { navigationSyncService } from './src/services/navigationSync';
import { AuthIssueModal } from './src/shared/components/AuthIssueModal';
// Initialize centralized error tracking service
errorTracking.initialize(Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_DSN);

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
const navigationRef = React.createRef<any>();

// Prevent auto-hide of splash until we're ready
SplashScreen.preventAutoHideAsync();

// Create a new instance of the QueryClient with optimized default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh for 5 minutes
      retry: 3, // Retry failed requests up to 3 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false, // Don't refetch when window regains focus (mobile doesn't need this)
      refetchOnReconnect: true, // Refetch when internet reconnects
      refetchOnMount: true, // Always refetch when component mounts
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Log React Query errors
      console.error('React Query error:', error, query);
      // You can also send this to Sentry or other error tracking services
      // Sentry.captureException(error, { tags: { queryKey: query.queryKey } });
    },
  }),
});

// Component to handle navigation state saving with auth context
const NavigationStateHandler: React.FC = () => {
  const { user, session } = useAuth();
  
  useEffect(() => {
    // Update current user ID in navigationSyncService
    navigationSyncService.setUserId(user?.id);
    
    // Clear navigation state on logout
    if (!session && !user) {
      console.log('🔒 NavigationSync: User logged out, clearing navigation state');
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

// Component to integrate React Query with Error Boundary
const AppWithErrorBoundary: React.FC<{ initialNavigationState?: any }> = ({ initialNavigationState }) => {
  const { reset } = useQueryErrorResetBoundary();
  
  // Sync auth state on app resume
  useAppStateSync();

  return (
    <ErrorBoundary onReset={reset}>
      <NetworkProvider>
        <AuthProvider>
          <AppInitializer>
            <ThemeProvider>
              <ThemedStatusBar />
              <NavigationContainer
                ref={navigationRef}
                initialState={initialNavigationState}
                onStateChange={async (state) => {
                  // Update last active timestamp whenever user navigates
                  await updateLastActiveTimestamp();
                  
                  // Save navigation state using navigationSyncService
                  // User ID will be set via NavigationStateHandler component
                  await navigationSyncService.saveState(state);
                }}
              >
                <NavigationStateHandler />
                <GracePeriodChecker />
                <SoftLaunchProvider>
                  <NotificationProvider>
                    <ToastProvider>
                      <AuthEffects />
                      {/* Offline Support UI Indicators */}
                      <OfflineBanner />
                      <SyncIndicator />
                      <AuthIssueModal />
                      <AppNavigator />
                      <NotificationHandler />
                    </ToastProvider>
                  </NotificationProvider>
                </SoftLaunchProvider>
              </NavigationContainer>
            </ThemeProvider>
          </AppInitializer>
        </AuthProvider>
      </NetworkProvider>
    </ErrorBoundary>
};

// App Initializer Component for handling async setup
const AppInitializer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [appIsReady, setAppIsReady] = useState(false);
  const [isAnimationFinished, setAnimationFinished] = useState(false);
  const { loading: authLoading } = useAuth(); // Get auth loading state

  useEffect(() => {
    const prepare = async () => {
      try {
        // Initialize RevenueCat
        const revenueCatApiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
        if (revenueCatApiKey) {
          const initSuccess = await revenueCatService.initialize(revenueCatApiKey);
          
          // Verify RevenueCat setup only if initialization succeeded
          if (initSuccess) {
            const { verifyRevenueCatSetup } = await import('./src/config/verifyRevenuecat');
            await verifyRevenueCatSetup();
          } else {
            console.warn('⚠️ RevenueCat initialization failed. Skipping verification.');
          }
        } else {
          console.warn('⚠️ RevenueCat API key not found in environment variables');
        }

        // Initialize Sync Manager for offline support
        console.log('🔄 Initializing Sync Manager...');
        await syncManager.start();
        console.log('✅ Sync Manager initialized');

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

  // Wait for BOTH animation to finish AND auth to finish loading
  const shouldShowMainApp = isAnimationFinished && !authLoading;

  if (!shouldShowMainApp) {
    // Show animated splash screen until both animation finishes AND auth loading completes
    return (
      <AnimatedSplashScreen
        onAnimationFinish={() => setAnimationFinished(true)}
      />
    );
  }

  // Once BOTH the animation is finished AND auth loading is complete, show the main navigator
  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      {children}
    </SafeAreaProvider>
  );
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

  // Set up the handler so the notification service can call our context function
  useEffect(() => {
    setNotificationTaskHandler(setTaskToShow);
  }, [setTaskToShow]);

  // Setup notification action listener
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionIdentifier = response.actionIdentifier;
      
      // Track notification opened
      const reminderId = response.notification.request.content.data?.reminderId as string | undefined;
      if (reminderId) {
        trackNotificationOpened(response.notification.request.identifier, reminderId);
      }
      
      // Handle action if present
      if (actionIdentifier && actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        handleNotificationAction(actionIdentifier, response.notification);
      }
    });

    return () => subscription.remove();
  }, []);

  // Create handlers for the TaskDetailSheet
  const handleCloseSheet = () => setTaskToShow(null);
  
  const handleEditTask = (task: any) => {
    // Close the sheet first
    setTaskToShow(null);
    // Navigate to edit modal - this would need navigation ref
    // For now, just close the sheet
    console.log('Edit task:', task);
  };

  const handleCompleteTask = async (task: any) => {
    // Handle task completion logic here
    console.log('Complete task:', task);
    // Data refresh is now handled by React Query in individual components
    // Close the sheet
    setTaskToShow(null);
  };

  const handleDeleteTask = async (task: any) => {
    // Handle task deletion logic here
    console.log('Delete task:', task);
    // Data refresh is now handled by React Query in individual components
    // Close the sheet
    setTaskToShow(null);
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
  const [initialNavigationState, setInitialNavigationState] = useState();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Starting app initialization...');
        
        // Initialize Analytics with your project token
        const projectToken = Constants.expoConfig?.extra?.EXPO_PUBLIC_MIXPANEL_TOKEN;
        await analyticsService.initialize(projectToken || '');
        
        // Track app launch
        analyticsService.track('App Launched', {
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
          app_version: '1.0.0',
        });
        
        // Check API version compatibility
        console.log('🔍 Checking API version compatibility...');
        try {
          await promptForUpdateIfNeeded();
          console.log('✅ API version check complete');
        } catch (error) {
          console.warn('⚠️ API version check failed:', error);
          // Don't block app startup if version check fails
        }
        
        // Restore navigation state using navigationSyncService
        // Note: Auth-aware validation will happen in AppWithErrorBoundary after auth loads
        console.log('📍 Restoring navigation state...');
        try {
          const savedState = await navigationSyncService.loadState();
          if (savedState) {
            setInitialNavigationState(savedState);
          }
        } catch (error) {
          console.error('❌ Failed to restore navigation state:', error);
          // Continue without restored state - app will start fresh
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppWithErrorBoundary initialNavigationState={initialNavigationState} />
    </QueryClientProvider>
  );
}

export default App;
