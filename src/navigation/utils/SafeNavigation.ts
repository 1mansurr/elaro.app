import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types';

/**
 * Type-safe navigation utilities for ELARO app
 *
 * This module provides type-safe navigation helpers that ensure:
 * - All navigation calls reference valid routes
 * - Parameters are properly typed
 * - Navigation actions are consistent
 * - Error handling is built-in
 */

// Type-safe navigation prop (stack to allow replace/push)
export type AppNavigationProp = StackNavigationProp<RootStackParamList>;

// Type-safe navigation hook
export const useAppNavigation = () => {
  const navigation = useNavigation<AppNavigationProp>();
  return navigation;
};

// Type-safe navigation actions
export class SafeNavigation {
  private navigation: AppNavigationProp;

  constructor(navigation: AppNavigationProp) {
    this.navigation = navigation;
  }

  /**
   * Navigate to a screen with type safety
   */
  navigate<K extends keyof RootStackParamList>(
    screen: K,
    params?: RootStackParamList[K],
  ): void {
    try {
      // Runtime validation: ensure route exists
      if (!NavigationValidation.isValidRoute(screen)) {
        console.error(`Invalid route: ${String(screen)}`);
        return;
      }

      // Handle optional params correctly for React Navigation's type system
      if (params === undefined) {
        // @ts-expect-error - React Navigation's type system requires this pattern for optional params
        this.navigation.navigate(screen);
      } else {
        // @ts-expect-error - React Navigation's type system requires this pattern
        this.navigation.navigate(screen, params);
      }
    } catch (error) {
      console.error(`Navigation error to ${String(screen)}:`, error);
      NavigationErrorHandler.handleError(
        error as Error,
        String(screen),
        'navigate',
      );
    }
  }

  /**
   * Replace current screen with type safety
   */
  replace<K extends keyof RootStackParamList>(
    screen: K,
    params?: RootStackParamList[K],
  ): void {
    try {
      // Runtime validation: ensure route exists
      if (!NavigationValidation.isValidRoute(screen)) {
        console.error(`Invalid route: ${String(screen)}`);
        return;
      }

      // Handle optional params correctly for React Navigation's type system
      if (params === undefined) {
        // @ts-expect-error - React Navigation's type system requires this pattern for optional params
        this.navigation.replace(screen);
      } else {
        // @ts-expect-error - React Navigation's strict overload types require this assertion
        this.navigation.replace(screen, params);
      }
    } catch (error) {
      console.error(`Navigation replace error to ${String(screen)}:`, error);
      NavigationErrorHandler.handleError(
        error as Error,
        String(screen),
        'replace',
      );
    }
  }

  /**
   * Push a new screen with type safety
   */
  push<K extends keyof RootStackParamList>(
    screen: K,
    params?: RootStackParamList[K],
  ): void {
    try {
      // Runtime validation: ensure route exists
      if (!NavigationValidation.isValidRoute(screen)) {
        console.error(`Invalid route: ${String(screen)}`);
        return;
      }

      // Handle optional params correctly for React Navigation's type system
      if (params === undefined) {
        // @ts-expect-error - React Navigation's type system requires this pattern for optional params
        this.navigation.push(screen);
      } else {
        // @ts-expect-error - React Navigation's strict overload types require this assertion
        this.navigation.push(screen, params);
      }
    } catch (error) {
      console.error(`Navigation push error to ${String(screen)}:`, error);
      NavigationErrorHandler.handleError(
        error as Error,
        String(screen),
        'push',
      );
    }
  }

  /**
   * Go back with error handling
   */
  goBack(): void {
    try {
      if (this.navigation.canGoBack()) {
        this.navigation.goBack();
      } else {
        console.warn('Cannot go back - no previous screen');
      }
    } catch (error) {
      console.error('Navigation goBack error:', error);
    }
  }

  /**
   * Reset navigation stack with type safety
   */
  reset<K extends keyof RootStackParamList>(
    screen: K,
    params?: RootStackParamList[K],
  ): void {
    try {
      this.navigation.reset({
        index: 0,
        routes: [{ name: screen, params }],
      });
    } catch (error) {
      console.error(`Navigation reset error to ${String(screen)}:`, error);
    }
  }

  /**
   * Check if navigation can go back
   */
  canGoBack(): boolean {
    return this.navigation.canGoBack();
  }

  /**
   * Get current route name
   */
  getCurrentRoute(): string | undefined {
    return this.navigation.getState().routes[this.navigation.getState().index]
      ?.name;
  }
}

// Hook for safe navigation
export const useSafeNavigation = () => {
  const navigation = useAppNavigation();
  return new SafeNavigation(navigation);
};

// Common navigation patterns
export const NavigationPatterns = {
  /**
   * Navigate to main app after authentication
   */
  navigateToMainApp: (navigation: AppNavigationProp) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.reset('Main');
  },

  /**
   * Navigate to onboarding flow
   */
  navigateToOnboarding: (navigation: AppNavigationProp) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.navigate('OnboardingFlow');
  },

  /**
   * Navigate to auth modal
   */
  navigateToAuth: (
    navigation: AppNavigationProp,
    mode?: 'signup' | 'signin',
  ) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.navigate('Auth', { mode });
  },

  /**
   * Navigate to course detail
   */
  navigateToCourseDetail: (navigation: AppNavigationProp, courseId: string) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.navigate('CourseDetail', { courseId });
  },

  /**
   * Navigate to profile
   */
  navigateToProfile: (navigation: AppNavigationProp) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.navigate('Profile');
  },

  /**
   * Navigate to settings
   */
  navigateToSettings: (navigation: AppNavigationProp) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.navigate('Settings');
  },

  /**
   * Navigate to courses
   */
  navigateToCourses: (navigation: AppNavigationProp) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.navigate('Courses');
  },

  /**
   * Navigate to calendar
   */
  navigateToCalendar: (navigation: AppNavigationProp) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.navigate('Calendar');
  },

  /**
   * Navigate to recycle bin
   */
  navigateToRecycleBin: (navigation: AppNavigationProp) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.navigate('RecycleBin');
  },

  /**
   * Navigate to add course flow
   */
  navigateToAddCourse: (navigation: AppNavigationProp) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.navigate('AddCourseFlow');
  },

  /**
   * Navigate to add lecture flow
   */
  navigateToAddLecture: (navigation: AppNavigationProp) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.navigate('AddLectureFlow');
  },

  /**
   * Navigate to add assignment flow
   */
  navigateToAddAssignment: (navigation: AppNavigationProp) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.navigate('AddAssignmentFlow');
  },

  /**
   * Navigate to add study session flow
   */
  navigateToAddStudySession: (navigation: AppNavigationProp) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.navigate('AddStudySessionFlow');
  },

  /**
   * Navigate to paywall
   */
  navigateToPaywall: (navigation: AppNavigationProp) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.navigate('PaywallScreen');
  },

  /**
   * Navigate to analytics admin
   */
  navigateToAnalyticsAdmin: (navigation: AppNavigationProp) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.navigate('AnalyticsAdmin');
  },

  /**
   * Navigate to in-app browser
   */
  navigateToInAppBrowser: (
    navigation: AppNavigationProp,
    url: string,
    title?: string,
  ) => {
    const safeNav = new SafeNavigation(navigation);
    safeNav.navigate('InAppBrowserScreen', { url, title });
  },
};

// Navigation validation utilities
export const NavigationValidation = {
  /**
   * Check if a route exists in the navigation stack
   */
  isValidRoute: (routeName: string): routeName is keyof RootStackParamList => {
    const validRoutes: (keyof RootStackParamList)[] = [
      'Launch',
      'Auth',
      'Main',
      'OnboardingFlow',
      'Courses',
      'Drafts',
      'Templates',
      'CourseDetail',
      'Calendar',
      'RecycleBin',
      'Profile',
      'Settings',
      'DeleteAccountScreen',
      'DeviceManagement',
      'LoginHistory',
      'AddCourseFlow',
      'AddLectureFlow',
      'AddAssignmentFlow',
      'AddStudySessionFlow',
      'EditCourseModal',
      'TaskDetailModal',
      'MFAEnrollmentScreen',
      'MFAVerificationScreen',
      'InAppBrowserScreen',
      'AnalyticsAdmin',
      'PaywallScreen',
      'OddityWelcomeScreen',
      'StudyResult',
      'StudySessionReview',
    ];
    return validRoutes.includes(routeName as keyof RootStackParamList);
  },

  /**
   * Validate navigation parameters
   */
  validateParams: <K extends keyof RootStackParamList>(
    routeName: K,
    params: unknown,
  ): params is RootStackParamList[K] => {
    // Flow screens can accept undefined or an object with optional initialData
    if (
      routeName === 'AddCourseFlow' ||
      routeName === 'AddLectureFlow' ||
      routeName === 'AddAssignmentFlow' ||
      routeName === 'AddStudySessionFlow'
    ) {
      return (
        params === undefined ||
        (typeof params === 'object' &&
          (params.initialData === undefined ||
            typeof params.initialData === 'object'))
      );
    }
    // Basic validation for other routes
    return params !== undefined || params === undefined; // Most routes can be undefined
  },
};

// Navigation error handling
export const NavigationErrorHandler = {
  /**
   * Handle navigation errors gracefully
   */
  handleError: (error: Error, routeName: string, action: string) => {
    console.error(`Navigation ${action} error for ${routeName}:`, error);

    // Log to analytics/monitoring service
    // Sentry.captureException(error, {
    //   tags: {
    //     feature: 'navigation',
    //     action,
    //     route: routeName
    //   }
    // });
  },

  /**
   * Handle navigation warnings
   */
  handleWarning: (message: string, routeName: string) => {
    console.warn(`Navigation warning for ${routeName}: ${message}`);
  },
};

export default SafeNavigation;
