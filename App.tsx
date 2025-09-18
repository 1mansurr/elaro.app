import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from './src/contexts/AuthContext';
import { SoftLaunchProvider } from './src/contexts/SoftLaunchContext';
import { DataProvider } from './src/contexts/DataContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/theme';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { useAuth } from './src/contexts/AuthContext';
import { useData } from './src/contexts/DataContext';
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

  useEffect(() => {
    const prepare = async () => {
      try {
        // Example: load fonts, user preferences, etc.
        // await Font.loadAsync({...})
        // await new Promise(resolve => setTimeout(resolve, 500)); // simulate loading

        // Future async initialization can go here:
        // - Load custom fonts
        // - Initialize analytics
        // - Check for app updates
        // - Load user preferences
        // - Initialize push notifications
        // - Check onboarding status

        // For now, just a small delay to ensure smooth transition
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
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.white,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

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
  const { fetchInitialData } = useData();
  
  useEffect(() => {
    if (user && user.id) {
      notificationService.initialize(user.id);
      // Fetch initial data when user is authenticated and has completed onboarding
      if (user.onboarding_completed) {
        fetchInitialData();
      }
    }
  }, [user, fetchInitialData]);
  return null;
}

function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState();

  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY);
        const state = savedStateString ? JSON.parse(savedStateString) : undefined;

        if (state !== undefined) {
          setInitialState(state);
        }
      } catch (e) {
        console.error("Failed to load navigation state", e);
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      restoreState();
    }
  }, [isReady]);

  if (!isReady) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <AppInitializer>
      <ThemeProvider>
        <ThemedStatusBar />
        <NavigationContainer
          initialState={initialState}
          onStateChange={(state) => AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state))}
        >
          <AuthProvider>
            <DataProvider>
              <SoftLaunchProvider>
                <AuthEffects />
                <AppNavigator />
              </SoftLaunchProvider>
            </DataProvider>
          </AuthProvider>
        </NavigationContainer>
      </ThemeProvider>
    </AppInitializer>
  );
}

export default Sentry.wrap(App);
