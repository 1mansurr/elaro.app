/**
 * Route Guards
 *
 * Defines which routes require authentication.
 * Used by navigationSync service to validate navigation state.
 */

// Routes that require authentication
export const AUTHENTICATED_ROUTES = [
  'Main',
  'Courses',
  'Profile',
  'Settings',
  'Calendar',
  'CourseDetail',
  'Drafts',
  'Templates',
  'RecycleBin',
  'AddCourseFlow',
  'AddLectureFlow',
  'AddAssignmentFlow',
  'AddStudySessionFlow',
  'EditCourseModal',
  'TaskDetailModal',
  'DeviceManagement',
  'LoginHistory',
  'DeleteAccountScreen',
  'MFAEnrollmentScreen',
  'MFAVerificationScreen',
  'AnalyticsAdmin',
  'PaywallScreen',
  'OddityWelcomeScreen',
  'StudyResult',
  'StudySessionReview',
] as const;

// Routes accessible to both authenticated and unauthenticated users
export const PUBLIC_ROUTES = ['Launch', 'Auth'] as const;

// Routes accessible during onboarding (authenticated but onboarding incomplete)
export const ONBOARDING_ROUTES = ['OnboardingFlow'] as const;

// Routes that should hide the tab bar (onboarding and post-onboarding fullscreen modals)
// These routes are presented as fullscreen modals and should not show the bottom tab bar
export const ROUTES_HIDING_TAB_BAR = [
  ...ONBOARDING_ROUTES,
  'PostOnboardingWelcome',
  'AddCourseFirst',
] as const;

/**
 * Routes that should NEVER be restored from saved navigation state on cold start.
 * These are temporary screens, modals, flows, or context-dependent screens that
 * should always start fresh when the app launches.
 */
export const NON_RESTORABLE_ROUTES = [
  // Modal flows
  'AddCourseFlow',
  'AddLectureFlow',
  'AddAssignmentFlow',
  'AddStudySessionFlow',
  'TaskDetailModal',
  'EditCourseModal',
  'InAppBrowserScreen',
  // Post-onboarding and first-time screens
  'PostOnboardingWelcome',
  'AddCourseFirst',
  // Subscription and welcome screens
  'OddityWelcomeScreen',
  // Study session results
  'StudyResult',
  'StudySessionReview',
  // Auth-related screens (should not persist)
  'Auth',
  'ForgotPassword',
  'ResetPassword',
  'MFAEnrollmentScreen',
  'MFAVerificationScreen',
  // Account management (sensitive, should not persist)
  'DeleteAccountScreen',
] as const;

/**
 * Check if a route requires authentication
 */
export function isAuthenticatedRoute(routeName: string): boolean {
  return (AUTHENTICATED_ROUTES as readonly string[]).includes(routeName);
}

/**
 * Check if a route is public (accessible to all)
 */
export function isPublicRoute(routeName: string): boolean {
  return (PUBLIC_ROUTES as readonly string[]).includes(routeName);
}

/**
 * Check if a route is part of onboarding flow
 */
export function isOnboardingRoute(routeName: string): boolean {
  return (ONBOARDING_ROUTES as readonly string[]).includes(routeName);
}

/**
 * Check if a route should hide the tab bar
 */
export function shouldHideTabBar(routeName: string): boolean {
  return (ROUTES_HIDING_TAB_BAR as readonly string[]).includes(routeName);
}

/**
 * Check if a route should NOT be restored from saved navigation state
 */
export function isNonRestorableRoute(routeName: string): boolean {
  return (NON_RESTORABLE_ROUTES as readonly string[]).includes(routeName);
}

/**
 * Validate route access based on authentication state
 */
export function validateRouteAccess(
  routeName: string,
  isAuthenticated: boolean,
  isOnboardingComplete: boolean = true,
): { allowed: boolean; reason?: string } {
  // Public routes are always allowed
  if (isPublicRoute(routeName)) {
    return { allowed: true };
  }

  // Authenticated routes require authentication
  if (isAuthenticatedRoute(routeName)) {
    if (!isAuthenticated) {
      return {
        allowed: false,
        reason: 'Route requires authentication',
      };
    }

    // If route is not onboarding-related, check onboarding status
    if (!isOnboardingRoute(routeName) && !isOnboardingComplete) {
      // Allow authenticated routes even if onboarding incomplete
      // (user can still navigate, but onboarding will be triggered separately)
      return { allowed: true };
    }

    return { allowed: true };
  }

  // Onboarding routes require authentication
  if (isOnboardingRoute(routeName)) {
    if (!isAuthenticated) {
      return {
        allowed: false,
        reason: 'Route requires authentication',
      };
    }
    return { allowed: true };
  }

  // Unknown route - allow by default (will be validated elsewhere)
  return { allowed: true };
}
