import React, { Suspense, lazy } from 'react';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';
import { View, ActivityIndicator, Text } from 'react-native';

import { RootStackParamList } from '@/types';
import { AddCourseProvider } from '@/features/courses/contexts/AddCourseContext';
import FeatureErrorBoundary from '@/shared/components/FeatureErrorBoundary';
import { MainTabNavigator } from './MainTabNavigator';
import { useSmartPreloading } from '@/hooks/useSmartPreloading';
import {
  SCREEN_CONFIGS,
  TRANSITIONS,
  GESTURES,
} from './constants/NavigationConstants';

// Critical screens - loaded immediately
import LaunchScreen from '@/shared/screens/LaunchScreen';
import HomeScreen from '@/features/dashboard/screens/HomeScreen';
import DraftsScreen from '@/features/dashboard/screens/DraftsScreen';
import TemplatesScreen from '@/features/dashboard/screens/TemplatesScreen';

// Lazy-loaded screens using bundle system for better performance
const CalendarScreen = lazy(() =>
  import('@/navigation/bundles/CalendarBundle').then(module => ({
    default: module.CalendarScreen,
  })),
);
const ProfileScreen = lazy(
  () => import('@/features/user-profile/screens/ProfileScreen'),
);
const SettingsScreen = lazy(() =>
  import('@/features/user-profile/screens').then(module => ({
    default: module.SettingsScreen,
  })),
);
const NotificationManagementScreen = lazy(() =>
  import('@/features/notifications/screens/NotificationManagementScreen').then(
    module => ({
      default: module.NotificationManagementScreen,
    }),
  ),
);
const CoursesScreen = lazy(() =>
  import('@/navigation/bundles/CoursesBundle').then(module => ({
    default: module.CoursesScreen,
  })),
);
const EditCourseModal = lazy(() =>
  import('@/navigation/bundles/CoursesBundle').then(module => ({
    default: module.EditCourseModal,
  })),
);
const CourseDetailScreen = lazy(() =>
  import('@/navigation/bundles/CoursesBundle').then(module => ({
    default: module.CourseDetailScreen,
  })),
);
const TaskDetailModal = lazy(
  () => import('@/shared/components/TaskDetailModal'),
);
const InAppBrowserScreen = lazy(() =>
  import('@/shared/screens').then(module => ({
    default: module.InAppBrowserScreen,
  })),
);
const StudyResultScreen = lazy(
  () => import('@/features/studySessions/screens/StudyResultScreen'),
);
const StudySessionReviewScreen = lazy(
  () => import('@/features/studySessions/screens/StudySessionReviewScreen'),
);
const RecycleBinScreen = lazy(() =>
  import('@/features/tasks/screens/RecycleBinScreen').then(module => ({
    default: module.RecycleBinScreen,
  })),
);

// Lazy-loaded navigators
const AddCourseNavigator = lazy(() => import('./AddCourseNavigator'));

// Lazy-loaded single screens for simplified flows
const AddLectureScreen = lazy(
  () => import('@/features/lectures/screens/AddLectureScreen'),
);

const Stack = createStackNavigator<RootStackParamList>();

// Loading fallback component
const LoadingFallback = () => (
  <View
    style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFFFFF', // Explicit white background for visibility
    }}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={{ marginTop: 16, color: '#666', fontSize: 14 }}>
      Loading...
    </Text>
  </View>
);

// Shared screen options with default transitions
// Individual screens can override these defaults via SCREEN_CONFIGS
const sharedScreenOptions = {
  headerShown: false,
  // Default transition for all screens (can be overridden per screen)
  ...TRANSITIONS.slideFromRight,
  // Default gesture configuration for all screens (can be overridden per screen)
  ...GESTURES.horizontal,
};

// Typed screen configuration interface
type ScreenConfig<
  K extends keyof RootStackParamList = keyof RootStackParamList,
> = {
  component: React.ComponentType<any>; // Use any to allow for custom prop types
  options?: StackNavigationOptions;
};

// Type-safe screens configuration
type ScreensConfig = Partial<
  Record<keyof RootStackParamList, ScreenConfig<keyof RootStackParamList>>
>;

// AddCourse Flow Wrapper with Provider (lazy loaded)
const AddCourseFlow = () => (
  <Suspense fallback={<LoadingFallback />}>
    <AddCourseProvider>
      <AddCourseNavigator />
    </AddCourseProvider>
  </Suspense>
);

// AddLecture Flow - Single screen modal (lazy loaded)
const AddLectureFlow = () => (
  <Suspense fallback={<LoadingFallback />}>
    <FeatureErrorBoundary featureName="the Lecture Creation flow">
      <AddLectureScreen />
    </FeatureErrorBoundary>
  </Suspense>
);

// Modal flows configuration
const modalFlows = {
  AddCourseFlow: {
    component: AddCourseFlow,
    options: SCREEN_CONFIGS.AddCourseFlow,
  },
  AddLectureFlow: {
    component: AddLectureFlow,
    options: SCREEN_CONFIGS.AddLectureFlow,
  },
  TaskDetailModal: {
    component: TaskDetailModal,
    options: SCREEN_CONFIGS.TaskDetailModal,
  },
  EditCourseModal: {
    component: EditCourseModal,
    options: SCREEN_CONFIGS.EditCourseModal,
  },
  InAppBrowserScreen: {
    component: InAppBrowserScreen,
    options: SCREEN_CONFIGS.InAppBrowserScreen,
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

// Main screens configuration
// Merge SCREEN_CONFIGS with header titles where needed
const mainScreens = {
  Main: {
    component: MainTabNavigator,
    options: SCREEN_CONFIGS.Main,
  },
  Drafts: {
    component: DraftsScreen,
    options: {
      ...SCREEN_CONFIGS.Drafts,
      headerTitle: 'Drafts',
    },
  },
  Templates: {
    component: TemplatesScreen,
    options: {
      ...SCREEN_CONFIGS.Templates,
      headerTitle: 'Templates',
    },
  },
  Courses: {
    component: CoursesScreen,
    options: SCREEN_CONFIGS.Courses,
  },
  CourseDetail: {
    component: CourseDetailScreen,
    options: {
      ...SCREEN_CONFIGS.CourseDetail,
      headerTitle: 'Course Details',
    },
  },
  Calendar: {
    component: CalendarScreen,
    options: {
      ...SCREEN_CONFIGS.Calendar,
      headerTitle: 'Calendar',
    },
  },
  Profile: {
    component: ProfileScreen,
    options: {
      ...SCREEN_CONFIGS.Profile,
      headerShown: false, // Hide navigation header - ProfileScreen has its own custom header
    },
  },
  Settings: {
    component: SettingsScreen,
    options: {
      ...SCREEN_CONFIGS.Settings,
      headerShown: false,
    },
  },
  NotificationManagement: {
    component: NotificationManagementScreen,
    options: {
      ...SCREEN_CONFIGS.NotificationManagement,
      headerTitle: 'Notifications',
    },
  },
  StudyResult: {
    component: StudyResultScreen,
    options: {
      ...SCREEN_CONFIGS.StudyResult,
      headerTitle: 'Study Results',
    },
  },
  StudySessionReview: {
    component: StudySessionReviewScreen,
    options: {
      ...SCREEN_CONFIGS.StudySessionReview,
      headerTitle: 'Review Study Session',
    },
  },
  RecycleBin: {
    component: RecycleBinScreen,
    options: {
      ...SCREEN_CONFIGS.RecycleBin,
      headerShown: false,
    },
  },
};

export const AuthenticatedNavigator: React.FC = () => {
  // Enable smart preloading for better performance
  useSmartPreloading();

  const initialRouteName: keyof RootStackParamList = 'Main';

  const navigatorKey = 'main-nav';

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Stack.Navigator
        key={navigatorKey}
        screenOptions={sharedScreenOptions}
        initialRouteName={initialRouteName}>
        {/* Launch screen removed - AppNavigator handles initial routing */}
        {/* Main app screens */}
        {renderScreens(mainScreens)}

        {/* Modal flows */}
        <Stack.Group>
          {Object.entries(modalFlows).map(([name, config]) => {
            // Type narrowing: ensure name is a valid route
            const routeName = name as keyof RootStackParamList;
            return (
              <Stack.Screen
                key={name}
                name={routeName}
                component={config.component}
                options={config.options}
              />
            );
          })}
        </Stack.Group>
      </Stack.Navigator>
    </Suspense>
  );
};
