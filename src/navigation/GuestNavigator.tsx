import React, { Suspense, lazy } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';

import { RootStackParamList } from '../types';
import FeatureErrorBoundary from '@/shared/components/FeatureErrorBoundary';
import { useSmartPreloading } from '../hooks/useSmartPreloading';

// Critical screens - loaded immediately
import LaunchScreen from '@/shared/screens/LaunchScreen';
import { AuthScreen } from '@/features/auth/screens/AuthScreen';
import GuestHomeScreen from '@/features/dashboard/screens/GuestHomeScreen';

// Lazy-loaded screens for guest users
const InAppBrowserScreen = lazy(() =>
  import('@/shared/screens').then(module => ({
    default: module.InAppBrowserScreen,
  })),
);

const Stack = createStackNavigator<RootStackParamList>();

// Loading fallback component
const LoadingFallback = () => (
  <View
    style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8f9fa',
    }}>
    <ActivityIndicator size="large" color="#007AFF" />
  </View>
);

// Shared screen options
const sharedScreenOptions = {
  headerShown: false,
};

// Typed screen configuration interface
type ScreenConfig = {
  component: React.ComponentType<any>;
  options?: any;
};

// Type-safe screens configuration
type ScreensConfig = Partial<Record<keyof RootStackParamList, ScreenConfig>>;

// Modal flows available to guest users
const guestModalFlows: ScreensConfig = {
  InAppBrowserScreen: {
    component: InAppBrowserScreen,
    options: { presentation: 'modal' as const, headerShown: false },
  },
};

// Helper function to render screens with type safety
const renderScreens = (screens: ScreensConfig) => {
  return Object.entries(screens)
    .map(([name, config]) => {
      // Type narrowing: ensure name is a valid route
      const routeName = name as keyof RootStackParamList;
      if (!config) return null;

      return (
        <Stack.Screen
          key={name}
          name={routeName}
          component={config.component}
          options={config.options || {}}
        />
      );
    })
    .filter(Boolean); // Remove any null entries
};

// Guest screens configuration
const guestScreens: ScreensConfig = {
  GuestHome: {
    component: GuestHomeScreen,
    options: {
      headerShown: false,
    },
  },
};

export const GuestNavigator: React.FC = () => {
  // Enable smart preloading for better performance
  useSmartPreloading();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Stack.Navigator screenOptions={sharedScreenOptions}>
        {/* Always show Launch screen */}
        <Stack.Screen name="Launch" component={LaunchScreen} />

        {/* Guest-specific screens */}
        {renderScreens(guestScreens)}

        {/* Modal flows available to guest users */}
        <Stack.Group>
          {/* Auth screen - available for sign up/sign in */}
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{
              presentation: 'modal' as const,
              headerShown: false,
            }}
          />

          {Object.entries(guestModalFlows)
            .map(([name, config]) => {
              // Type narrowing: ensure name is a valid route
              const routeName = name as keyof RootStackParamList;
              if (!config) return null;

              return (
                <Stack.Screen
                  key={name}
                  name={routeName}
                  component={config.component}
                  options={config.options}
                />
              );
            })
            .filter(Boolean)}
        </Stack.Group>
      </Stack.Navigator>
    </Suspense>
  );
};
