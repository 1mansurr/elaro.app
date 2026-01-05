import React, { Suspense, lazy, useState, useEffect } from 'react';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { AddCourseProvider } from '@/features/courses/contexts/AddCourseContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { UsageLimitPaywallProvider } from '@/contexts/UsageLimitPaywallContext';
import FeatureErrorBoundary from '@/shared/components/FeatureErrorBoundary';
import { MainTabNavigator } from './MainTabNavigator';
import { useSmartPreloading } from '@/hooks/useSmartPreloading';
import { supabase } from '@/services/supabase';
import {
  SCREEN_CONFIGS,
  TRANSITIONS,
  GESTURES,
} from './constants/NavigationConstants';

// Critical screens - loaded immediately
import LaunchScreen from '@/shared/screens/LaunchScreen';
import { AuthScreen } from '@/features/auth/screens/AuthScreen';
import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';
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

// Lazy-loaded post-onboarding welcome screen
const PostOnboardingWelcomeScreen = lazy(() =>
  import('@/features/onboarding/screens/PostOnboardingWelcomeScreen').then(
    module => ({
      default: module.PostOnboardingWelcomeScreen,
    }),
  ),
);

// Lazy-loaded add course first screen
const AddCourseFirstScreen = lazy(() =>
  import('@/features/onboarding/screens/AddCourseFirstScreen').then(module => ({
    default: module.AddCourseFirstScreen,
  })),
);

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
      headerShown: false, // Hide navigation header - ProfileScreen has its own custom header
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
  NotificationManagement: {
    component: NotificationManagementScreen,
    options: {
      ...SCREEN_CONFIGS.NotificationManagement,
      headerTitle: 'Notifications',
    },
  },
  OnboardingFlow: { component: OnboardingFlow },
  AddCourseFirst: {
    component: AddCourseFirstScreen,
    options: {
      headerShown: false,
    },
  },
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

const ADD_COURSE_FIRST_KEY = 'hasSeenAddCourseFirstScreen';

export const AuthenticatedNavigator: React.FC = () => {
  const { user, isInitializing } = useAuth();
  const [hasSeenAddCourseFirst, setHasSeenAddCourseFirst] = useState<
    boolean | null
  >(null);
  const [courseCount, setCourseCount] = useState<number | null>(null);
  const [isCheckingWelcome, setIsCheckingWelcome] = useState(true);

  // Enable smart preloading for better performance
  useSmartPreloading();

  // Check AddCourseFirst screen status and course count
  // NOTE: PostOnboardingWelcomeScreen manages its own visibility - we don't check it here
  // IMPORTANT: This useEffect must be called BEFORE any early returns to follow Rules of Hooks
  // All hooks must be called in the same order on every render
  useEffect(() => {
    // STEP 2 FIX: Add user guard to prevent crashes if user is null or minimal user without ID
    if (!user?.id) {
      setIsCheckingWelcome(false);
      setHasSeenAddCourseFirst(true); // Default to true (skip screen) if no user
      setCourseCount(0);
      return;
    }

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isCheckingWelcome) {
        console.warn(
          '⚠️ [AuthenticatedNavigator] Welcome check timeout - proceeding with defaults',
        );
        setIsCheckingWelcome(false);
        setHasSeenAddCourseFirst(true);
        setCourseCount(0);
      }
    }, 5000); // 5 second timeout

    const checkWelcomeScreens = async () => {
      if (!user.onboarding_completed) {
        setIsCheckingWelcome(false);
        return;
      }

      try {
        // Only check AddCourseFirst - PostOnboardingWelcomeScreen is self-managed
        const hasSeenAddCourse =
          await AsyncStorage.getItem(ADD_COURSE_FIRST_KEY);
        // Explicitly handle null/undefined - if not 'true', treat as false (user hasn't seen it)
        // This ensures new users who complete onboarding will see AddCourseFirst
        const hasSeen = hasSeenAddCourse === 'true';
        setHasSeenAddCourseFirst(hasSeen);

        // Check course count (used for other logic, not PostOnboardingWelcome)
        const { count, error } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('deleted_at', null);

        if (error) {
          console.error('Error checking course count:', error);
          setCourseCount(0); // Default to 0 on error
        } else {
          setCourseCount(count || 0);
        }
      } catch (error) {
        console.error('Error checking welcome screen status:', error);
        // Default to NOT showing AddCourseFirst on error (assume already seen)
        setHasSeenAddCourseFirst(true);
        setCourseCount(0);
      } finally {
        setIsCheckingWelcome(false);
      }
    };

    checkWelcomeScreens();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user]);

  // GUARD: Show loading screen while AuthContext is initializing
  // This prevents race conditions where onboarding is shown before we have a valid profile
  // NOTE: All hooks must be called BEFORE this early return to follow Rules of Hooks
  if (isInitializing) {
    if (__DEV__) {
      console.log(
        '⏳ [AuthenticatedNavigator] Waiting for auth initialization...',
      );
    }
    return <LoadingFallback />;
  }

  // Show onboarding if user hasn't completed it
  // NOTE: This check only runs after isInitializing is false, ensuring we have a valid profile
  if (user && !user.onboarding_completed) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <OnboardingProvider>
          <OnboardingNavigator />
        </OnboardingProvider>
      </Suspense>
    );
  }

  // Show loading while checking welcome screen status
  if (isCheckingWelcome || courseCount === null) {
    return <LoadingFallback />;
  }

  // Determine initial route based on AddCourseFirst screen status
  let initialRouteName: keyof RootStackParamList = 'Main';

  // Show AddCourseFirst if user hasn't seen it yet (regardless of course count)
  // After onboarding, users will always see this first
  if (hasSeenAddCourseFirst === false) {
    initialRouteName = 'AddCourseFirst';
  }
  // HARDENING: PostOnboardingWelcome is self-managed by PostOnboardingWelcomeScreen component
  // It is NEVER set as initialRouteName - it's only navigated to programmatically
  // The screen itself enforces all visibility rules and will redirect if already seen
  // This ensures the screen never appears on app startup or navigation state restoration

  if (__DEV__) {
    console.log('🔍 [AuthenticatedNavigator] Initial route determined:', {
      initialRouteName,
      hasSeenAddCourseFirst,
      courseCount,
    });
  }

  // Show main app if onboarding is completed
  // Use a key that includes hasSeenAddCourseFirst to force remount when it changes
  // This ensures the navigator starts with the correct initialRouteName
  // When hasSeenAddCourseFirst changes from null -> false, the navigator remounts with AddCourseFirst as initial route
  const navigatorKey = `main-nav-${hasSeenAddCourseFirst ?? 'loading'}`;

  return (
    <UsageLimitPaywallProvider>
      <Suspense fallback={<LoadingFallback />}>
        <Stack.Navigator
          key={navigatorKey}
          screenOptions={sharedScreenOptions}
          initialRouteName={initialRouteName}>
          {/* Launch screen removed - AppNavigator handles initial routing */}
          {/* Main app screens */}
          {renderScreens(mainScreens)}

          {/* PostOnboardingWelcome - full screen modal in its own group to hide tab bar */}
          {/* NOTE: PostOnboardingWelcomeScreen is self-managed - it enforces all visibility rules */}
          <Stack.Group
            screenOptions={{
              presentation: 'fullScreenModal',
              headerShown: false,
            }}>
            <Stack.Screen
              name="PostOnboardingWelcome"
              component={PostOnboardingWelcomeScreen}
              options={{
                gestureEnabled: false,
                // HARDENING: Screen component itself handles redirect if already seen
                // This screen is NEVER used as initialRouteName (enforced by logic above)
                // Screen is in MODAL_FLOW_ROUTES so it won't be restored on app restart
              }}
            />
          </Stack.Group>

          {/* Modal flows */}
          <Stack.Group>
            {/* Auth screen - available for switching accounts */}
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={SCREEN_CONFIGS.Auth}
            />

            {/* Forgot Password screen */}
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{
                presentation: 'modal' as const,
                headerShown: false,
              }}
            />

            {/* Reset Password screen */}
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
              options={{
                presentation: 'modal' as const,
                headerShown: false,
              }}
            />

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
    </UsageLimitPaywallProvider>
  );
};
