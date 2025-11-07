/**
 * Route Guards
 *
 * Defines which routes require authentication and which are guest-only.
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

// Routes accessible only to non-authenticated users
export const GUEST_ROUTES = ['GuestHome'] as const;

// Routes accessible to both authenticated and guest users
export const PUBLIC_ROUTES = ['Launch', 'Auth'] as const;

// Routes accessible during onboarding (authenticated but onboarding incomplete)
export const ONBOARDING_ROUTES = ['OnboardingFlow'] as const;

/**
 * Check if a route requires authentication
 */
export function isAuthenticatedRoute(routeName: string): boolean {
  return (AUTHENTICATED_ROUTES as readonly string[]).includes(routeName);
}

/**
 * Check if a route is guest-only
 */
export function isGuestRoute(routeName: string): boolean {
  return (GUEST_ROUTES as readonly string[]).includes(routeName);
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

  // Guest routes require no authentication
  if (isGuestRoute(routeName)) {
    if (isAuthenticated) {
      return {
        allowed: false,
        reason: 'Route is guest-only',
      };
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
