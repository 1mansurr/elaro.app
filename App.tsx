import React, { useCallback, useEffect, useState, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://67aec2aa78b4d87e34a615d837360d08@o4509741415661568.ingest.de.sentry.io/4509741432766544',
  tracesSampleRate: 1.0,
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

// Create a new instance of the QueryClient
const queryClient = new QueryClient();

// Error Boundary Component for catching unexpected errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
    // Here you could send error to analytics service
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: COLORS.white,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          {/* You could add a more sophisticated error UI here */}
        </View>
      );
    }

    return this.props.children;
  }
}

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

function App() {
  const [isReady, setIsReady] = useState(false);
  // Navigation state persistence disabled for debugging
  // const [initialState, setInitialState] = useState();
  const navigationRef = useRef(null);

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
        const projectToken = 'e3ac54f448ea19920f62c8b4d928f83e';
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
      <AppInitializer>
        <ThemeProvider>
          <ThemedStatusBar />
          <NavigationContainer
            ref={navigationRef}
            // initialState={initialState} // Disabled to prevent modal from reopening
            // onStateChange={(state) => AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state))} // Temporarily disabled for debugging
          >
            <AuthProvider>
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
    </QueryClientProvider>
  );
}

export default Sentry.wrap(App);
