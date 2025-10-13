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

import { useAuth } from '@/features/auth/contexts/AuthContext';
import { RootStackParamList, MainTabParamList } from '../types';
import AddCourseNavigator from './AddCourseNavigator';
import AddLectureNavigator from './AddLectureNavigator';
import AddAssignmentNavigator from './AddAssignmentNavigator';
import AddStudySessionNavigator from './AddStudySessionNavigator';
import { AddCourseProvider } from '@/features/courses/contexts/AddCourseContext';
import { AddLectureProvider } from '@/features/lectures/contexts/AddLectureContext';
import { AddAssignmentProvider } from '@/features/assignments/contexts/AddAssignmentContext';
import { AddStudySessionProvider } from '@/features/studySessions/contexts/AddStudySessionContext';
import FeatureErrorBoundary from '@/shared/components/FeatureErrorBoundary';

// Screens
import LaunchScreen from '@/shared/screens/LaunchScreen';
import { AuthScreen } from '@/features/auth/screens/AuthScreen';
import WelcomeScreen from '@/features/onboarding/screens/WelcomeScreen';
import OnboardingNavigator from './OnboardingNavigator';
import { OnboardingProvider } from '../contexts/OnboardingContext';
import HomeScreen from '@/features/dashboard/screens/HomeScreen';
import { CalendarScreen } from '@/features/calendar';
import AccountScreen from '@/features/user-profile/screens/AccountScreen';
import ProfileScreen from '@/features/user-profile/screens/ProfileScreen';
import { CoursesScreen, EditCourseModal, CourseDetailScreen } from '@/features/courses/screens';
import TaskDetailModal from '@/shared/components/TaskDetailModal';
import RecycleBinScreen from '@/features/data-management/screens/RecycleBinScreen';
import { MFAEnrollmentScreen, MFAVerificationScreen } from '@/features/auth/screens';
import { InAppBrowserScreen } from '@/shared/screens';

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
  <FeatureErrorBoundary featureName="the Assignment Creation flow">
    <AddAssignmentProvider>
      <AddAssignmentNavigator />
    </AddAssignmentProvider>
  </FeatureErrorBoundary>
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


// Screen configuration objects for better organization
const authScreens = {
  Launch: { component: LaunchScreen },
  Auth: { 
    component: AuthScreen,
    options: {
      presentation: 'modal',
      headerShown: false,
    }
  },
  Welcome: { component: WelcomeScreen },
  OnboardingFlow: { component: OnboardingFlow },
};

const mainScreens = {
  Main: { component: MainTabNavigator },
  Courses: { 
    component: CoursesScreen,
    options: {
      headerShown: true,
      headerStyle: {
        backgroundColor: '#FFFFFF',
      },
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }
  },
  CourseDetail: { 
    component: CourseDetailScreen,
    options: {
      headerShown: true,
      headerTitle: 'Course Details',
      headerStyle: {
        backgroundColor: '#FFFFFF',
      },
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }
  },
  Calendar: { 
    component: CalendarScreen,
    options: {
      headerShown: true,
      headerTitle: 'Calendar',
      headerStyle: {
        backgroundColor: '#FFFFFF',
      },
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }
  },
  RecycleBin: { 
    component: RecycleBinScreen,
    options: {
      headerShown: true,
      headerTitle: 'Recycle Bin',
      headerStyle: {
        backgroundColor: '#FFFFFF',
      },
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }
  },
  MFAEnrollmentScreen: { 
    component: MFAEnrollmentScreen,
    options: {
      headerShown: true,
      headerTitle: 'Enable MFA',
      headerStyle: {
        backgroundColor: '#FFFFFF',
      },
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }
  },
  MFAVerificationScreen: { 
    component: MFAVerificationScreen,
    options: {
      headerShown: true,
      headerTitle: 'Verify Your Identity',
      headerStyle: {
        backgroundColor: '#FFFFFF',
      },
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }
  },
  Profile: { 
    component: ProfileScreen,
    options: {
      headerShown: true,
      headerTitle: 'Edit Profile',
      headerStyle: {
        backgroundColor: '#FFFFFF',
      },
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }
  },
};

const modalFlows = {
  AddCourseFlow: { 
    component: AddCourseFlow,
    options: { 
      presentation: 'modal',
      headerShown: false 
    }
  },
  AddLectureFlow: { 
    component: AddLectureFlow,
    options: { 
      presentation: 'modal',
      headerShown: false 
    }
  },
  AddAssignmentFlow: { 
    component: AddAssignmentFlow,
    options: { 
      presentation: 'modal',
      headerShown: false 
    }
  },
  AddStudySessionFlow: { 
    component: AddStudySessionFlow,
    options: { 
      presentation: 'modal',
      headerShown: false 
    }
  },
  EditCourseModal: { 
    component: EditCourseModal,
    options: ({ navigation }: any) => ({
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
    })
  },
  TaskDetailModal: { 
    component: TaskDetailModal,
    options: {
      headerTitle: 'Task Details',
    }
  },
  InAppBrowserScreen: { 
    component: InAppBrowserScreen,
    options: { 
      presentation: 'modal',
      headerShown: false 
    }
  },
};

// Helper function to render screens from a config object
const renderScreens = (screens: Record<string, { component: React.ComponentType<any>; options?: any }>) => {
  return Object.entries(screens).map(([name, config]) => (
    <Stack.Screen 
      key={name} 
      name={name as any} 
      component={config.component} 
      options={config.options}
    />
  ));
};

// Main App Navigator component
export const AppNavigator: React.FC = () => {
  const { session, loading } = useAuth();

  return (
    <Stack.Navigator screenOptions={sharedScreenOptions}>
      {/* Always show Launch screen */}
      <Stack.Screen name="Launch" component={LaunchScreen} />
      
      {/* Render screens based on authentication state */}
      {session ? (
        <>
          {/* Main app screens */}
          {renderScreens(mainScreens)}
          
          {/* Modal flows */}
          <Stack.Group>
            {renderScreens(modalFlows)}
          </Stack.Group>
        </>
      ) : (
        /* Auth screens */
        renderScreens(authScreens)
      )}
    </Stack.Navigator>
  );
};
