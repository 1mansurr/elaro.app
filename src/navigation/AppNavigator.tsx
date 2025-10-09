import React from 'react';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList, MainTabParamList } from '../types';
import AddCourseNavigator from './AddCourseNavigator';
import AddLectureNavigator from './AddLectureNavigator';
import AddAssignmentNavigator from './AddAssignmentNavigator';
import AddStudySessionNavigator from './AddStudySessionNavigator';
import { AddCourseProvider } from '../contexts/AddCourseContext';
import { AddLectureProvider } from '../contexts/AddLectureContext';
import { AddAssignmentProvider } from '../contexts/AddAssignmentContext';
import { AddStudySessionProvider } from '../contexts/AddStudySessionContext';

// Screens
import LaunchScreen from '../screens/LaunchScreen';
import AuthChooserScreen from '../screens/auth/AuthChooserScreen';
import { AuthScreen } from '../screens/AuthScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import OnboardingNavigator from './OnboardingNavigator';
import { OnboardingProvider } from '../contexts/OnboardingContext';
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AccountScreen from '../screens/AccountScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CoursesScreen from '../screens/CoursesScreen';
import AddCourseModal from '../screens/modals/AddCourseModal';
import EditCourseModal from '../screens/modals/EditCourseModal';
import TaskDetailModal from '../screens/modals/TaskDetailModal';
import CourseDetailScreen from '../screens/CourseDetailScreen';
import ComingSoonScreen from '../screens/ComingSoonScreen';
import RecycleBinScreen from '../screens/RecycleBinScreen';

// Navigators
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab bar icon helper for cleaner code
const getTabBarIcon = (
  routeName: keyof MainTabParamList,
  focused: boolean,
): keyof typeof Ionicons.glyphMap => {
  switch (routeName) {
    case 'Home':
      return focused ? 'home' : 'home-outline';
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
  const { session, user } = useAuth();
  
  const getFirstName = () => {
    if (!session || !user) {
      return 'Account';
    }
    
    // Use the first_name from the users table (populated by our database trigger)
    if (user.first_name) {
      return user.first_name;
    }
    
    // Fallback for older users - check user_metadata
    if (user.user_metadata?.first_name) {
      return user.user_metadata.first_name;
    }
    
    // Default if no name is found
    return 'Account';
  };
  
  return (
    <Tab.Navigator screenOptions={tabBarScreenOptions(insets, theme)}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen 
        name="Account" 
        component={AccountScreen}
        options={{
          tabBarLabel: getFirstName(),
        }}
      />
    </Tab.Navigator>
  );
};

// AddCourse Flow Wrapper with Provider
const AddCourseFlow = () => (
  <AddCourseProvider>
    <AddCourseNavigator />
  </AddCourseProvider>
);

// AddLecture Flow Wrapper with Provider
const AddLectureFlow = () => (
  <AddLectureProvider>
    <AddLectureNavigator />
  </AddLectureProvider>
);

// AddAssignment Flow Wrapper with Provider
const AddAssignmentFlow = () => (
  <AddAssignmentProvider>
    <AddAssignmentNavigator />
  </AddAssignmentProvider>
);

// AddStudySession Flow Wrapper with Provider
const AddStudySessionFlow = () => (
  <AddStudySessionProvider>
    <AddStudySessionNavigator />
  </AddStudySessionProvider>
);

const OnboardingFlow = () => (
  <OnboardingProvider>
    <OnboardingNavigator />
  </OnboardingProvider>
);

// Auth Screen Wrapper
const AuthScreenWrapper = ({ navigation }: any) => (
  <AuthChooserScreen />
);

// Main App Navigator component
export const AppNavigator: React.FC = () => {
  const { session, loading } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={sharedScreenOptions}>
      {/* Always show Launch screen */}
      <Stack.Screen name="Launch" component={LaunchScreen} />
        {/* Auth chooser screen */}
        <Stack.Screen 
          name="AuthChooser" 
          component={AuthChooserScreen}
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        {/* Auth screen */}
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen}
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        {/* Welcome screen */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        {/* Onboarding form screen */}
        <Stack.Screen name="OnboardingFlow" component={OnboardingFlow} />
        {/* Main app routes */}
        <Stack.Screen name="Main" component={MainTabNavigator} />
        {/* Course Management screens */}
        <Stack.Screen 
          name="Courses" 
          component={CoursesScreen}
          options={{
            headerShown: true,
            headerStyle: {
              backgroundColor: '#FFFFFF',
            },
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="CourseDetail" 
          component={CourseDetailScreen}
          options={{
            headerShown: true,
            headerTitle: 'Course Details',
            headerStyle: {
              backgroundColor: '#FFFFFF',
            },
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="Calendar" 
          component={CalendarScreen}
          options={{
            headerShown: true,
            headerTitle: 'Calendar',
            headerStyle: {
              backgroundColor: '#FFFFFF',
            },
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="ComingSoon" 
          component={ComingSoonScreen}
          options={{
            headerShown: true,
            headerTitle: 'Coming Soon',
            headerStyle: {
              backgroundColor: '#FFFFFF',
            },
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="RecycleBin" 
          component={RecycleBinScreen}
          options={{
            headerShown: true,
            headerTitle: 'Recycle Bin',
            headerStyle: {
              backgroundColor: '#FFFFFF',
            },
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            headerShown: true,
            headerTitle: 'Edit Profile',
            headerStyle: {
              backgroundColor: '#FFFFFF',
            },
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        
        {/* Modal Screens */}
        <Stack.Group>
          <Stack.Screen
            name="AddCourseFlow"
            component={AddCourseFlow}
            options={{ 
              presentation: 'modal',
              headerShown: false 
            }}
          />
          <Stack.Screen
            name="AddLectureFlow"
            component={AddLectureFlow}
            options={{ 
              presentation: 'modal',
              headerShown: false 
            }}
          />
          <Stack.Screen
            name="AddAssignmentFlow"
            component={AddAssignmentFlow}
            options={{ 
              presentation: 'modal',
              headerShown: false 
            }}
          />
          <Stack.Screen
            name="AddStudySessionFlow"
            component={AddStudySessionFlow}
            options={{ 
              presentation: 'modal',
              headerShown: false 
            }}
          />
          <Stack.Screen 
            name="AddCourseModal" 
            component={AddCourseModal}
            options={({ navigation }) => ({
              presentation: 'modal',
              headerShown: true,
              headerTitle: 'Add Course',
              headerLeft: () => (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{ marginLeft: 16 }}
                >
                  <Ionicons name="close" size={24} color="#007AFF" />
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen 
            name="EditCourseModal" 
            component={EditCourseModal}
            options={({ navigation }) => ({
              presentation: 'modal',
              headerShown: true,
              headerTitle: 'Edit Course',
              headerLeft: () => (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{ marginLeft: 16 }}
                >
                  <Ionicons name="close" size={24} color="#007AFF" />
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen
            name="TaskDetailModal"
            component={TaskDetailModal}
            options={{
              headerTitle: 'Task Details',
            }}
          />
        </Stack.Group>
      </Stack.Navigator>
  );
};
