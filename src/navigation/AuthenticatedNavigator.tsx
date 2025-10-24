import React, { Suspense, lazy } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';

import { RootStackParamList } from '../types';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { AddCourseProvider } from '@/features/courses/contexts/AddCourseContext';
import { OnboardingProvider } from '../contexts/OnboardingContext';
import FeatureErrorBoundary from '@/shared/components/FeatureErrorBoundary';
import { MainTabNavigator } from './MainTabNavigator';
import { useSmartPreloading } from '../hooks/useSmartPreloading';

// Critical screens - loaded immediately
import LaunchScreen from '@/shared/screens/LaunchScreen';
import { AuthScreen } from '@/features/auth/screens/AuthScreen';
import HomeScreen from '@/features/dashboard/screens/HomeScreen';
import { AccountScreen } from '@/features/user-profile/screens/AccountScreen';
import DraftsScreen from '@/features/dashboard/screens/DraftsScreen';
import TemplatesScreen from '@/features/dashboard/screens/TemplatesScreen';

// Lazy-loaded screens using bundle system for better performance
const CalendarScreen = lazy(() => import('@/navigation/bundles/CalendarBundle').then(module => ({ default: module.CalendarScreen })));
const ProfileScreen = lazy(() => import('@/features/user-profile/screens/ProfileScreen'));
const SettingsScreen = lazy(() => import('@/features/user-profile/screens').then(module => ({ default: module.SettingsScreen })));
const DeleteAccountScreen = lazy(() => import('@/features/user-profile/screens/DeleteAccountScreen'));
const CoursesScreen = lazy(() => import('@/navigation/bundles/CoursesBundle').then(module => ({ default: module.CoursesScreen })));
const EditCourseModal = lazy(() => import('@/navigation/bundles/CoursesBundle').then(module => ({ default: module.EditCourseModal })));
const CourseDetailScreen = lazy(() => import('@/navigation/bundles/CoursesBundle').then(module => ({ default: module.CourseDetailScreen })));
const TaskDetailModal = lazy(() => import('@/shared/components/TaskDetailModal'));
const RecycleBinScreen = lazy(() => import('@/features/data-management/screens/RecycleBinScreen'));
const MFAEnrollmentScreen = lazy(() => import('@/navigation/bundles/AuthBundle').then(module => ({ default: module.MFAEnrollmentScreen })));
const MFAVerificationScreen = lazy(() => import('@/navigation/bundles/AuthBundle').then(module => ({ default: module.MFAVerificationScreen })));
const InAppBrowserScreen = lazy(() => import('@/shared/screens').then(module => ({ default: module.InAppBrowserScreen })));
const AnalyticsAdminScreen = lazy(() => import('@/features/admin/components/AnalyticsAdminDashboard'));

// Lazy-loaded navigators
const OnboardingNavigator = lazy(() => import('./OnboardingNavigator'));
const AddCourseNavigator = lazy(() => import('./AddCourseNavigator'));

// Lazy-loaded single screens for simplified flows
const AddAssignmentScreen = lazy(() => import('@/features/assignments/screens/AddAssignmentScreen'));
const AddLectureScreen = lazy(() => import('@/features/lectures/screens/AddLectureScreen'));
const AddStudySessionScreen = lazy(() => import('@/features/studySessions/screens/AddStudySessionScreen'));

const Stack = createStackNavigator<RootStackParamList>();

// Loading fallback component
const LoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
    <ActivityIndicator size="large" color="#007AFF" />
  </View>
);

// Shared screen options
const sharedScreenOptions = {
  headerShown: false,
};

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
    options: { presentation: 'modal' as const, headerShown: false }
  },
  AddLectureFlow: { 
    component: AddLectureFlow,
    options: { presentation: 'modal' as const, headerShown: false }
  },
  AddAssignmentFlow: { 
    component: AddAssignmentFlow,
    options: { presentation: 'modal' as const, headerShown: false }
  },
  AddStudySessionFlow: { 
    component: AddStudySessionFlow,
    options: { presentation: 'modal' as const, headerShown: false }
  },
  TaskDetailModal: { 
    component: TaskDetailModal,
    options: { presentation: 'modal' as const, headerShown: false }
  },
  EditCourseModal: { 
    component: EditCourseModal,
    options: { presentation: 'modal' as const, headerShown: false }
  },
  InAppBrowserScreen: { 
    component: InAppBrowserScreen,
    options: { presentation: 'modal' as const, headerShown: false }
  },
};

// Helper function to render screens
const renderScreens = (screens: Record<string, any>) => {
  return Object.entries(screens).map(([name, config]) => (
    <Stack.Screen 
      key={name} 
      name={name as any} 
      component={config.component} 
      options={config.options || {}}
    />
  ));
};

// Main screens configuration
const mainScreens = {
  Main: { component: MainTabNavigator },
  Drafts: {
    component: DraftsScreen,
    options: {
      headerShown: true,
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTitleStyle: { fontWeight: 'bold' },
      headerTitle: 'Drafts',
    }
  },
  Templates: {
    component: TemplatesScreen,
    options: {
      headerShown: true,
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTitleStyle: { fontWeight: 'bold' },
      headerTitle: 'Templates',
    }
  },
  Courses: { 
    component: CoursesScreen,
    options: {
      headerShown: true,
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTitleStyle: { fontWeight: 'bold' },
    }
  },
  CourseDetail: { 
    component: CourseDetailScreen,
    options: {
      headerShown: true,
      headerTitle: 'Course Details',
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTitleStyle: { fontWeight: 'bold' },
    }
  },
  Calendar: { 
    component: CalendarScreen,
    options: {
      headerShown: true,
      headerTitle: 'Calendar',
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTitleStyle: { fontWeight: 'bold' },
    }
  },
  RecycleBin: { 
    component: RecycleBinScreen,
    options: {
      headerShown: true,
      headerTitle: 'Recycle Bin',
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTitleStyle: { fontWeight: 'bold' },
    }
  },
  MFAEnrollmentScreen: { 
    component: MFAEnrollmentScreen,
    options: {
      headerShown: true,
      headerTitle: 'Enable MFA',
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTitleStyle: { fontWeight: 'bold' },
    }
  },
  MFAVerificationScreen: { 
    component: MFAVerificationScreen,
    options: {
      headerShown: true,
      headerTitle: 'Verify Your Identity',
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTitleStyle: { fontWeight: 'bold' },
    }
  },
  Profile: { 
    component: ProfileScreen,
    options: {
      headerShown: true,
      headerTitle: 'Edit Profile',
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTitleStyle: { fontWeight: 'bold' },
    }
  },
  Settings: { 
    component: SettingsScreen,
    options: {
      headerShown: true,
      headerTitle: 'Settings',
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTitleStyle: { fontWeight: 'bold' },
    }
  },
  DeleteAccountScreen: { 
    component: DeleteAccountScreen,
    options: {
      headerShown: true,
      headerTitle: 'Delete Account',
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTitleStyle: { fontWeight: 'bold' },
    }
  },
  OnboardingFlow: { component: OnboardingFlow },
  AnalyticsAdmin: { 
    component: AnalyticsAdminScreen,
    options: {
      headerShown: true,
      headerTitle: 'Analytics Admin',
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTitleStyle: { fontWeight: 'bold' },
    }
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
        <Stack.Screen name="Launch" component={LaunchScreen} />
        
        {/* Main app screens */}
        {renderScreens(mainScreens)}
        
        {/* Modal flows */}
        <Stack.Group>
          {/* Auth screen - available for switching accounts */}
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
                options={config.options}
              />
            ))}
        </Stack.Group>
      </Stack.Navigator>
    </Suspense>
  );
};
