import React, { Suspense, lazy } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, TextStyle } from 'react-native';

import { RootStackParamList } from '../types';
import { FONT_WEIGHTS, COLORS } from '@/constants/theme';
import FeatureErrorBoundary from '@/shared/components/FeatureErrorBoundary';
import {
  SCREEN_CONFIGS,
  SCREEN_OPTIONS,
} from './constants/NavigationConstants';

// Type definitions for type-safe screen configuration
type ScreenConfig = {
  component: React.ComponentType<any>;
  options?: any;
};

type ScreensConfig = Partial<Record<keyof RootStackParamList, ScreenConfig>>;

// Critical auth screens - loaded immediately
import { AuthScreen } from '@/features/auth/screens/AuthScreen';

// Lazy-loaded auth screens
const MFAEnrollmentScreen = lazy(() =>
  import('@/navigation/bundles/AuthBundle').then(module => ({
    default: module.MFAEnrollmentScreen,
  })),
);
const MFAVerificationScreen = lazy(() =>
  import('@/navigation/bundles/AuthBundle').then(module => ({
    default: module.MFAVerificationScreen,
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
      backgroundColor: 'COLORS.backgroundSecondary ',
    }}>
    <ActivityIndicator size="large" color="COLORS.primary" />
  </View>
);

// Shared screen options for auth flows
const authScreenOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: COLORS.white },
  headerTitleStyle: {
    fontWeight: FONT_WEIGHTS.bold as unknown as TextStyle['fontWeight'],
  },
  headerShadowVisible: false,
};

// Auth screens configuration
const authScreens = {
  Auth: {
    component: AuthScreen,
    options: SCREEN_CONFIGS.Auth,
  },
  MFAEnrollmentScreen: {
    component: MFAEnrollmentScreen,
    options: SCREEN_CONFIGS.MFAEnrollmentScreen,
  },
  MFAVerificationScreen: {
    component: MFAVerificationScreen,
    options: SCREEN_CONFIGS.MFAVerificationScreen,
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

/**
 * AuthNavigator - Handles all authentication-related flows
 *
 * Responsibilities:
 * - User authentication (sign up/sign in)
 * - MFA enrollment and verification
 * - Account switching
 *
 * This navigator is used by AppNavigator for unauthenticated users
 * and can be accessed from AuthenticatedNavigator for auth-related flows.
 */
export const AuthNavigator: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Stack.Navigator screenOptions={authScreenOptions}>
        <Stack.Group>{renderScreens(authScreens)}</Stack.Group>
      </Stack.Navigator>
    </Suspense>
  );
};

export default AuthNavigator;
