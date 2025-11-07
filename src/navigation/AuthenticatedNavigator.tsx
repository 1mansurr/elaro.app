import React, { Suspense, lazy } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';

import { RootStackParamList } from '../types';
import { useAuth } from '@/contexts/AuthContext';
import { AddCourseProvider } from '@/features/courses/contexts/AddCourseContext';
import { OnboardingProvider } from '../contexts/OnboardingContext';
import FeatureErrorBoundary from '@/shared/components/FeatureErrorBoundary';
import { MainTabNavigator } from './MainTabNavigator';
import { useSmartPreloading } from '../hooks/useSmartPreloading';
import {
  SCREEN_CONFIGS,
  TRANSITIONS,
  GESTURES,
} from './constants/NavigationConstants';

// Critical screens - loaded immediately
import LaunchScreen from '@/shared/screens/LaunchScreen';
import { AuthScreen } from '@/features/auth/screens/AuthScreen';
import HomeScreen from '@/features/dashboard/screens/HomeScreen';
import { AccountScreen } from '@/features/user-profile/screens/AccountScreen';
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
const DeleteAccountScreen = lazy(
  () => import('@/features/user-profile/screens/DeleteAccountScreen'),
);
const DeviceManagementScreen = lazy(() =>
  import('@/features/user-profile/screens/DeviceManagementScreen').then(
    module => ({ default: module.DeviceManagementScreen }),
  ),
);
const LoginHistoryScreen = lazy(() =>
  import('@/features/user-profile/screens/LoginHistoryScreen').then(module => ({
    default: module.LoginHistoryScreen,
  })),
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
const RecycleBinScreen = lazy(
  () => import('@/features/data-management/screens/RecycleBinScreen'),
);
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
const InAppBrowserScreen = lazy(() =>
  import('@/shared/screens').then(module => ({
    default: module.InAppBrowserScreen,
  })),
);
const AnalyticsAdminScreen = lazy(
  () => import('@/features/admin/components/AnalyticsAdminDashboard'),
);
const StudyResultScreen = lazy(
  () => import('@/features/studySessions/screens/StudyResultScreen'),
);
const StudySessionReviewScreen = lazy(
  () => import('@/features/studySessions/screens/StudySessionReviewScreen'),
);
const PaywallScreen = lazy(() =>
  import('@/features/subscription/screens/PaywallScreen').then(module => ({
    default: module.PaywallScreen,
  })),
);
const OddityWelcomeScreen = lazy(
  () => import('@/features/subscription/screens/OddityWelcomeScreen'),
);

// Lazy-loaded navigators
const OnboardingNavigator = lazy(() => import('./OnboardingNavigator'));
const AddCourseNavigator = lazy(() => import('./AddCourseNavigator'));

// Lazy-loaded single screens for simplified flows
const AddAssignmentScreen = lazy(
  () => import('@/features/assignments/screens/AddAssignmentScreen'),
);
const AddLectureScreen = lazy(
  () => import('@/features/lectures/screens/AddLectureScreen'),
);
const AddStudySessionScreen = lazy(
  () => import('@/features/studySessions/screens/AddStudySessionScreen'),
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
type ScreenConfig = {
  component: React.ComponentType<any>;
  options?: any;
};

// Type-safe screens configuration
type ScreensConfig = Partial<Record<keyof RootStackParamList, ScreenConfig>>;

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

// AddAssignment Flow - Single screen modal (lazy loaded)
const AddAssignmentFlow = () => (
  <Suspense fallback={<LoadingFallback />}>
    <FeatureErrorBoundary featureName="the Assignment Creation flow">
      <AddAssignmentScreen />
    </FeatureErrorBoundary>
  </Suspense>
);

// AddStudySession Flow - Single screen modal (lazy loaded)
const AddStudySessionFlow = () => (
  <Suspense fallback={<LoadingFallback />}>
    <FeatureErrorBoundary featureName="the Study Session Creation flow">
      <AddStudySessionScreen />
    </FeatureErrorBoundary>
  </Suspense>
);

const OnboardingFlow = () => (
  <Suspense fallback={<LoadingFallback />}>
    <OnboardingProvider>
      <OnboardingNavigator />
    </OnboardingProvider>
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
  AddAssignmentFlow: {
    component: AddAssignmentFlow,
    options: SCREEN_CONFIGS.AddAssignmentFlow,
  },
  AddStudySessionFlow: {
    component: AddStudySessionFlow,
    options: SCREEN_CONFIGS.AddStudySessionFlow,
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
  PaywallScreen: {
    component: PaywallScreen,
    options: SCREEN_CONFIGS.PaywallScreen,
  },
  OddityWelcomeScreen: {
    component: OddityWelcomeScreen,
    options: SCREEN_CONFIGS.OddityWelcomeScreen,
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
  RecycleBin: {
    component: RecycleBinScreen,
    options: {
      ...SCREEN_CONFIGS.RecycleBin,
      headerTitle: 'Recycle Bin',
    },
  },
  MFAEnrollmentScreen: {
    component: MFAEnrollmentScreen,
    options: {
      ...SCREEN_CONFIGS.MFAEnrollmentScreen,
      headerTitle: 'Enable MFA',
    },
  },
  MFAVerificationScreen: {
    component: MFAVerificationScreen,
    options: {
      ...SCREEN_CONFIGS.MFAVerificationScreen,
      headerTitle: 'Verify Your Identity',
    },
  },
  Profile: {
    component: ProfileScreen,
    options: {
      ...SCREEN_CONFIGS.Profile,
      headerTitle: 'Edit Profile',
    },
  },
  Settings: {
    component: SettingsScreen,
    options: {
      ...SCREEN_CONFIGS.Settings,
      headerTitle: 'Settings',
    },
  },
  DeleteAccountScreen: {
    component: DeleteAccountScreen,
    options: {
      ...SCREEN_CONFIGS.DeleteAccountScreen,
      headerTitle: 'Delete Account',
    },
  },
  DeviceManagement: {
    component: DeviceManagementScreen,
    options: {
      ...SCREEN_CONFIGS.DeviceManagement,
      headerTitle: 'Device Management',
    },
  },
  LoginHistory: {
    component: LoginHistoryScreen,
    options: {
      ...SCREEN_CONFIGS.LoginHistory,
      headerTitle: 'Login History',
    },
  },
  OnboardingFlow: { component: OnboardingFlow },
  AnalyticsAdmin: {
    component: AnalyticsAdminScreen,
    options: {
      ...SCREEN_CONFIGS.AnalyticsAdmin,
      headerTitle: 'Analytics Admin',
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
};

export const AuthenticatedNavigator: React.FC = () => {
  const { user } = useAuth();

  // Enable smart preloading for better performance
  useSmartPreloading();

  // Show onboarding if user hasn't completed it
  if (user && !user.onboarding_completed) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <OnboardingProvider>
          <OnboardingNavigator />
        </OnboardingProvider>
      </Suspense>
    );
  }

  // Show main app if onboarding is completed
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Stack.Navigator screenOptions={sharedScreenOptions}>
        {/* Always show Launch screen */}
        <Stack.Screen
          name="Launch"
          component={LaunchScreen}
          options={SCREEN_CONFIGS.Launch}
        />

        {/* Main app screens */}
        {renderScreens(mainScreens)}

        {/* Modal flows */}
        <Stack.Group>
          {/* Auth screen - available for switching accounts */}
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={SCREEN_CONFIGS.Auth}
          />

          {Object.entries(modalFlows)
            .filter(([name]) => name !== 'InAppBrowserScreen')
            .map(([name, config]) => {
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
