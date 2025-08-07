import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/theme';
import { RootStackParamList, MainTabParamList } from '../types';
import { featureGates } from '../config/featureGates';

// Screens
import LaunchScreen from '../screens/LaunchScreen';
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AccountScreen from '../screens/AccountScreen';
import { PushTestScreen } from '../screens/PushTestScreen';
import AddStudyScreen from '../screens/AddStudyScreen';
import AddEventScreen from '../screens/AddEventScreen';
import AddTaskEventScreen from '../screens/AddTaskEventScreen';
import SpacedRepetitionScreen from '../screens/SpacedRepetitionScreen';
import ScheduleSR from '../screens/ScheduleSR';
import { AuthScreenWrapper } from '../screens/AuthScreenWrapper';

import { BottomTabBar } from '@react-navigation/bottom-tabs';

// Navigators
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Route grouping constants for better organization
const AUTH_ROUTES = {
  Launch: LaunchScreen,
  Auth: AuthScreenWrapper,
} as const;

const MAIN_ROUTES = {
  Main: null, // Will be handled by MainTabNavigator
} as const;

const FUNCTIONAL_ROUTES = {
  PushTest: PushTestScreen,
  AddStudy: AddStudyScreen,
  AddEvent: AddEventScreen,
  AddTaskEvent: AddTaskEventScreen,
  SpacedRepetitionScreen: SpacedRepetitionScreen,
  ScheduleSR: ScheduleSR,
} as const;

// Tab bar icon helper for cleaner code
const getTabBarIcon = (
  routeName: keyof MainTabParamList,
  focused: boolean,
): keyof typeof Ionicons.glyphMap => {
  switch (routeName) {
    case 'Home':
      return focused ? 'home' : 'home-outline';
    case 'Calendar':
      return focused ? 'calendar' : 'calendar-outline';
    case 'Account':
      return focused ? 'person' : 'person-outline';
    default:
      return 'ellipse-outline';
  }
};

// Shared screen options for consistency
const sharedScreenOptions: StackNavigationOptions = {
  headerShown: false,
};

const tabBarScreenOptions =
  (insets: any, theme: any) =>
  ({ route }: { route: { name: keyof MainTabParamList } }) => ({
    tabBarIcon: ({
      focused,
      color,
      size,
    }: {
      focused: boolean;
      color: string;
      size: number;
    }) => (
      <Ionicons
        name={getTabBarIcon(route.name, focused)}
        size={24}
        color={color}
        style={{ marginBottom: 0 }}
      />
    ),
    tabBarActiveTintColor: theme.accent,
    tabBarInactiveTintColor: theme.textSecondary,
    tabBarStyle: {
      backgroundColor: theme.card,
      borderTopColor: theme.border,
      height: Platform.OS === 'ios' ? 70 + insets.bottom : 70,
      paddingBottom: insets.bottom > 0 ? insets.bottom : 14,
      paddingTop: 10,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: -2 },
      shadowRadius: 10,
      elevation: 10,
      borderWidth: 0,
    },
    tabBarLabelStyle: {
      fontSize: 13,
      marginTop: 2,
    },
    tabBarIconStyle: {
      marginTop: 4,
      marginBottom: 0,
    },
    headerShown: false,
  });

// Main Tab Navigator component
const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  return (
    <Tab.Navigator screenOptions={tabBarScreenOptions(insets, theme)}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
};

// Main App Navigator component
export const AppNavigator: React.FC = () => {
  const { session, loading } = useAuth();

  // Debug logs for navigation state
  console.log('[AppNavigator] loading:', loading, '| session:', session);

  // Determine initial route based on auth state
  const getInitialRouteName = (): keyof RootStackParamList => {
    return 'Launch';
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={sharedScreenOptions}
        initialRouteName={getInitialRouteName()}>
        {/* Always show Launch screen */}
        <Stack.Screen name="Launch" component={LaunchScreen} />
        {/* Main app routes */}
        <Stack.Screen name="Main" component={MainTabNavigator} />
        {/* Show other screens only when not loading */}
        {!loading && (
          <>
            {/* Auth and onboarding routes */}
            <Stack.Screen name="Auth" component={AuthScreenWrapper} />
            {/* Functional screens */}
            <Stack.Screen name="PushTest" component={PushTestScreen} />
            <Stack.Screen name="AddStudy" component={AddStudyScreen} />
            <Stack.Screen name="AddEvent" component={AddEventScreen} />
            <Stack.Screen name="AddTaskEvent" component={AddTaskEventScreen} />
            {/* Conditionally render LearningStyleScreen based on feature flag */}
            {/* <Stack.Screen
              name="LearningStyleScreen"
              component={LearningStyleScreen}
            /> */}
            <Stack.Screen
              name="SpacedRepetitionScreen"
              component={SpacedRepetitionScreen}
            />
            <Stack.Screen name="ScheduleSR" component={ScheduleSR} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
