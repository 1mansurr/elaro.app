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
import { setNotificationTaskHandler } from './src/services/notifications';
import { revenueCatService } from './src/services/revenueCat';
import { mixpanelService } from './src/services/mixpanel';
import { AnalyticsEvents } from './src/services/analyticsEvents';
import { Platform } from 'react-native';
import TaskDetailSheet from './src/shared/components/TaskDetailSheet';
import { AppNavigator } from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/theme';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import AnimatedSplashScreen from './src/shared/screens/AnimatedSplashScreen';
import { useAuth } from './src/features/auth/contexts/AuthContext';
import { notificationService } from './src/services/notifications';
import { GracePeriodChecker } from './src/components/GracePeriodChecker';
import * as Sentry from '@sentry/react-native';
import ErrorBoundary from './src/shared/components/ErrorBoundary';
import { updateLastActiveTimestamp } from './src/utils/sessionTimeout';

Sentry.init({
  dsn: Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  enabled: !!Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_DSN, // Only enable if DSN exists
});

// Add global unhandled promise rejection logger for freeze/debugging
if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  // TODO: Remove or improve this logger for production use
}

// Prevent auto-hide of splash until we're ready
SplashScreen.preventAutoHideAsync();

// Navigation state persistence key
const PERSISTENCE_KEY = 'NAVIGATION_STATE_V1';

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

// Component to integrate React Query with Error Boundary
const AppWithErrorBoundary: React.FC = () => {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary onReset={reset}>
      <AppInitializer>
        <ThemeProvider>
          <ThemedStatusBar />
          <NavigationContainer
            ref={navigationRef}
            onStateChange={async () => {
              // Update last active timestamp whenever user navigates
              await updateLastActiveTimestamp();
            }}
            // initialState={initialState} // Disabled to prevent modal from reopening
            // onStateChange={(state) => AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state))} // Temporarily disabled for debugging
          >
            <AuthProvider>
              <GracePeriodChecker />
              <SoftLaunchProvider>
                <NotificationProvider>
                  <AuthEffects />
                  <AppNavigator />
                  <NotificationHandler />
                </NotificationProvider>
              </SoftLaunchProvider>
            </AuthProvider>
          </NavigationContainer>
        </ThemeProvider>
      </AppInitializer>
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
    if (user && user.id) {
      notificationService.initialize(user.id);
      // Initialize Mixpanel with user ID
      mixpanelService.identifyUser(user.id);
      
      // Track user login
      mixpanelService.track(AnalyticsEvents.USER_LOGGED_IN, {
        user_id: user.id,
        subscription_tier: user.subscription_tier || 'free',
        onboarding_completed: user.onboarding_completed || false,
        timestamp: new Date().toISOString(),
      });
      
      // Data fetching is now handled by React Query hooks in individual components
    }
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

// Navigation ref needs to be accessible
const navigationRef = useRef(null);

function App() {
  const [isReady, setIsReady] = useState(false);
  // Navigation state persistence disabled for debugging
  // const [initialState, setInitialState] = useState();

  // useEffect(() => {
  //   const restoreState = async () => {
  //     try {
  //       const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY);
  //       const state = savedStateString ? JSON.parse(savedStateString) : undefined;

  //       if (state !== undefined) {
  //         setInitialState(state);
  //       }
  //     } catch (e) {
  //       console.error("Failed to load navigation state", e);
  //     } finally {
  //       setIsReady(true);
  //     }
  //   };

  //   if (!isReady) {
  //     restoreState();
  //   }
  // }, [isReady]);

  // Simplified initialization without persistence
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Starting app initialization...');
        
        // Initialize Mixpanel with your project token
        const projectToken = Constants.expoConfig?.extra?.EXPO_PUBLIC_MIXPANEL_TOKEN;
        if (!projectToken) {
          console.warn('⚠️ Mixpanel token not found in environment variables');
          return;
        }
        console.log('📱 About to initialize Mixpanel...');
        await mixpanelService.initialize(projectToken, true); // Enable consent for testing
        
        console.log('⏳ Waiting 2 seconds before tracking events...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Track app launch
        console.log('📊 Tracking app launch event...');
        mixpanelService.track(AnalyticsEvents.APP_OPENED, {
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
          app_version: '1.0.0',
        });
        
        // Add a test event to verify connection
        console.log('🧪 Tracking test event...');
        mixpanelService.track('Mixpanel Test Event', {
          test: true,
          message: 'This is a test event to verify Mixpanel connection',
          timestamp: new Date().toISOString(),
        });
        
        console.log('✅ Mixpanel initialization and tracking complete!');
      } catch (error) {
        console.error('❌ Failed to initialize Mixpanel:', error);
      }
      
      setIsReady(true);
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
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppWithErrorBoundary />
    </QueryClientProvider>
  );
}

export default Sentry.wrap(App);
