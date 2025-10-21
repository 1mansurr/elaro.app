import React, { Suspense, lazy } from 'react';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinkingOptions } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useScreenTracking } from '../hooks/useScreenTracking';

import { useAuth } from '@/features/auth/contexts/AuthContext';
import { RootStackParamList, MainTabParamList } from '../types';
import { AddCourseProvider } from '@/features/courses/contexts/AddCourseContext';
import { AddLectureProvider } from '@/features/lectures/contexts/AddLectureContext';
import { AddStudySessionProvider } from '@/features/studySessions/contexts/AddStudySessionContext';
import { OnboardingProvider } from '../contexts/OnboardingContext';
import FeatureErrorBoundary from '@/shared/components/FeatureErrorBoundary';
import { AuthNavigationHandler } from '@/components/AuthNavigationHandler';

// Critical screens - loaded immediately (NOT lazy loaded)
import LaunchScreen from '@/shared/screens/LaunchScreen';
import { AuthScreen } from '@/features/auth/screens/AuthScreen';
import HomeScreen from '@/features/dashboard/screens/HomeScreen';
import { AccountScreen } from '@/features/user-profile/screens/AccountScreen';

// Lazy-loaded screens - loaded on demand
const CalendarScreen = lazy(() => import('@/features/calendar').then(module => ({ default: module.CalendarScreen })));
const ProfileScreen = lazy(() => import('@/features/user-profile/screens/ProfileScreen'));
const SettingsScreen = lazy(() => import('@/features/user-profile/screens').then(module => ({ default: module.SettingsScreen })));
const CoursesScreen = lazy(() => import('@/features/courses/screens').then(module => ({ default: module.CoursesScreen })));
const EditCourseModal = lazy(() => import('@/features/courses/screens').then(module => ({ default: module.EditCourseModal })));
const CourseDetailScreen = lazy(() => import('@/features/courses/screens').then(module => ({ default: module.CourseDetailScreen })));
const TaskDetailModal = lazy(() => import('@/shared/components/TaskDetailModal'));
const RecycleBinScreen = lazy(() => import('@/features/data-management/screens/RecycleBinScreen'));
const MFAEnrollmentScreen = lazy(() => import('@/features/auth/screens').then(module => ({ default: module.MFAEnrollmentScreen })));
const MFAVerificationScreen = lazy(() => import('@/features/auth/screens').then(module => ({ default: module.MFAVerificationScreen })));
const InAppBrowserScreen = lazy(() => import('@/shared/screens').then(module => ({ default: module.InAppBrowserScreen })));

// Lazy-loaded navigators
const OnboardingNavigator = lazy(() => import('./OnboardingNavigator'));
const AddCourseNavigator = lazy(() => import('./AddCourseNavigator'));
const AddLectureNavigator = lazy(() => import('./AddLectureNavigator'));
const AddStudySessionNavigator = lazy(() => import('./AddStudySessionNavigator'));

// Lazy-loaded single screens for simplified flows
const AddAssignmentScreen = lazy(() => import('@/features/assignments/screens/AddAssignmentScreen'));

// Navigators
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Loading fallback component
const LoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
    <ActivityIndicator size="large" color="#007AFF" />
  </View>
);

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

// AddCourse Flow Wrapper with Provider (lazy loaded)
const AddCourseFlow = () => (
  <Suspense fallback={<LoadingFallback />}>
    <AddCourseProvider>
      <AddCourseNavigator />
    </AddCourseProvider>
  </Suspense>
);

// AddLecture Flow Wrapper with Provider (lazy loaded)
const AddLectureFlow = () => (
  <Suspense fallback={<LoadingFallback />}>
    <AddLectureProvider>
      <AddLectureNavigator />
    </AddLectureProvider>
  </Suspense>
);

// AddAssignment Flow - Single screen modal (lazy loaded)
const AddAssignmentFlow = () => (
  <Suspense fallback={<LoadingFallback />}>
    <FeatureErrorBoundary featureName="the Assignment Creation flow">
      <AddAssignmentScreen />
    </FeatureErrorBoundary>
  </Suspense>
);

// AddStudySession Flow Wrapper with Provider (lazy loaded)
const AddStudySessionFlow = () => (
  <Suspense fallback={<LoadingFallback />}>
    <AddStudySessionProvider>
      <AddStudySessionNavigator />
    </AddStudySessionProvider>
  </Suspense>
);

const OnboardingFlow = () => (
  <Suspense fallback={<LoadingFallback />}>
    <OnboardingProvider>
      <OnboardingNavigator />
    </OnboardingProvider>
  </Suspense>
);


// Screen configuration objects for better organization
const authScreens = {
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
  Settings: { 
    component: SettingsScreen,
    options: {
      headerShown: true,
      headerTitle: 'Settings',
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
      presentation: 'modal' as const,
      headerShown: false 
    }
  },
  AddLectureFlow: { 
    component: AddLectureFlow,
    options: { 
      presentation: 'modal' as const,
      headerShown: false 
    }
  },
  AddAssignmentFlow: { 
    component: AddAssignmentFlow,
    options: { 
      presentation: 'modal' as const,
      headerShown: false 
    }
  },
  AddStudySessionFlow: { 
    component: AddStudySessionFlow,
    options: { 
      presentation: 'modal' as const,
      headerShown: false 
    }
  },
  EditCourseModal: { 
    component: EditCourseModal,
    options: ({ navigation }: any) => ({
      presentation: 'modal' as const,
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
      presentation: 'modal' as const,
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
      options={config.options || {}}
    />
  ));
};

// Deep linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['elaro://', 'https://elaro.app'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: 'home',
          Account: 'account',
        },
      },
      Courses: 'courses',
      CourseDetail: 'course/:courseId',
      Calendar: 'calendar',
      RecycleBin: 'recycle-bin',
      Profile: 'profile',
      Settings: 'settings',
      TaskDetailModal: {
        path: ':taskType/:taskId',
        parse: {
          taskId: (taskId: string) => taskId,
          taskType: (taskType: string) => {
            // Map URL-friendly names to internal task types
            const typeMap: Record<string, 'study_session' | 'lecture' | 'assignment'> = {
              'study-session': 'study_session',
              'assignment': 'assignment',
              'lecture': 'lecture',
            };
            return typeMap[taskType] || taskType;
          },
        },
      },
      AddCourseFlow: 'add/course',
      AddLectureFlow: 'add/lecture',
      AddAssignmentFlow: 'add/assignment',
      AddStudySessionFlow: 'add/study-session',
      MFAEnrollmentScreen: 'mfa/enroll',
      MFAVerificationScreen: 'mfa/verify',
      InAppBrowserScreen: 'browser',
    },
  },
};

// Main App Navigator component
export const AppNavigator: React.FC = () => {
  const { session, loading } = useAuth();
  
  // Enable automatic screen tracking
  useScreenTracking();

  return (
    <>
      {/* Handle navigation based on auth state changes */}
      <AuthNavigationHandler />
      
      {/* Wrap the entire navigator with Suspense for lazy-loaded screens */}
      <Suspense fallback={<LoadingFallback />}>
        <Stack.Navigator 
          screenOptions={sharedScreenOptions}
        >
          {/* Always show Launch screen */}
          <Stack.Screen name="Launch" component={LaunchScreen} />
        
        {/* Always show Main screen - it will handle authentication state internally */}
        <Stack.Screen name="Main" component={MainTabNavigator} />
        
        {/* Always show InAppBrowserScreen - needed for both authenticated and guest users */}
        <Stack.Screen 
          name="InAppBrowserScreen" 
          component={InAppBrowserScreen}
          options={{ 
            presentation: 'modal' as const,
            headerShown: false 
          }}
        />
        
        {/* Render screens based on authentication state */}
        {session ? (
          <>
            {/* Main app screens (excluding Main since it's always available) */}
            {Object.entries(mainScreens)
              .filter(([name]) => name !== 'Main')
              .map(([name, config]) => (
                <Stack.Screen 
                  key={name} 
                  name={name as any} 
                  component={config.component} 
                  options={(config as any).options || {}}
                />
              ))}
          </>
        ) : (
          /* Auth screens */
          renderScreens(authScreens)
        )}
        
        {/* Modal flows available to both guest and authenticated users */}
        <Stack.Group>
          {/* Auth screen - available to both authenticated and guest users */}
          <Stack.Screen 
            name="Auth"
            component={AuthScreen}
            options={{
              presentation: 'modal' as const,
              headerShown: false,
            }}
          />
          
          {Object.entries(modalFlows)
            .filter(([name]) => name !== 'InAppBrowserScreen')
            .map(([name, config]) => (
              <Stack.Screen 
                key={name} 
                name={name as any} 
                component={config.component} 
                options={(config as any).options}
              />
            ))}
        </Stack.Group>
      </Stack.Navigator>
      </Suspense>
    </>
  );
};
