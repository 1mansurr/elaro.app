// Example usage of Mixpanel analytics throughout the ELARO app
// This file demonstrates how to properly track events with PII protection

import { mixpanelService } from './mixpanel';
import { AnalyticsEvents } from './analyticsEvents';

// Example 1: Tracking user onboarding completion
export const trackOnboardingCompletion = (userProperties: {
  university?: string;
  program?: string;
  courseCount: number;
}) => {
  mixpanelService.track(AnalyticsEvents.USER_ONBOARDING_COMPLETED, {
    course_count: userProperties.courseCount,
    has_university: !!userProperties.university,
    has_program: !!userProperties.program,
    onboarding_duration: 'calculated_in_minutes', // Calculate this elsewhere
  });

  // Set user properties (non-PII)
  mixpanelService.setUserProperties({
    university: userProperties.university,
    program: userProperties.program,
    onboarding_completed: true,
  });
};

// Example 2: Tracking course creation
export const trackCourseCreation = (courseData: {
  courseName: string;
  courseCode?: string;
  assignmentCount: number;
  lectureCount: number;
}) => {
  mixpanelService.track(AnalyticsEvents.COURSE_CREATED, {
    course_name_length: courseData.courseName.length,
    has_course_code: !!courseData.courseCode,
    initial_assignment_count: courseData.assignmentCount,
    initial_lecture_count: courseData.lectureCount,
  });
};

// Example 3: Tracking study session completion
export const trackStudySessionCompletion = (sessionData: {
  duration: number; // in minutes
  taskType: 'assignment' | 'lecture' | 'review';
  completionRate: number; // percentage
  spacedRepetitionEnabled: boolean;
}) => {
  mixpanelService.track(AnalyticsEvents.STUDY_SESSION_COMPLETED, {
    duration_minutes: sessionData.duration,
    task_type: sessionData.taskType,
    completion_rate: sessionData.completionRate,
    spaced_repetition_enabled: sessionData.spacedRepetitionEnabled,
  });
};

// Example 4: Tracking subscription events
export const trackSubscriptionStart = (subscriptionData: {
  tier: 'premium' | 'pro';
  paymentMethod: string;
  trialUsed: boolean;
}) => {
  mixpanelService.track(AnalyticsEvents.SUBSCRIPTION_STARTED, {
    tier: subscriptionData.tier,
    payment_method: subscriptionData.paymentMethod,
    trial_used: subscriptionData.trialUsed,
  });

  // Update user properties
  mixpanelService.setUserProperties({
    subscription_tier: subscriptionData.tier,
  });
};

// Example 5: Tracking feature usage
export const trackFeatureUsage = (
  featureName: string,
  additionalData?: Record<string, any>,
) => {
  const sanitizedData = {
    feature_name: featureName,
    ...additionalData,
  };

  // Track generic feature usage event
  mixpanelService.track('Feature Used', sanitizedData);
};

// Example 6: Tracking screen views (for navigation analytics)
export const trackScreenView = (
  screenName: string,
  additionalData?: Record<string, any>,
) => {
  mixpanelService.track('Screen Viewed', {
    screen_name: screenName,
    ...additionalData,
  });
};

// Example 7: Tracking errors (non-PII)
export const trackError = (
  errorType: string,
  errorMessage: string,
  context?: Record<string, any>,
) => {
  mixpanelService.track(AnalyticsEvents.ERROR_OCCURRED, {
    error_type: errorType,
    error_message: errorMessage.substring(0, 100), // Limit message length
    ...context,
  });
};

// Example 8: Tracking notification interactions
export const trackNotificationInteraction = (
  notificationType: string,
  action: string,
) => {
  mixpanelService.track(AnalyticsEvents.NOTIFICATION_OPENED, {
    notification_type: notificationType,
    action: action,
  });
};

// Example 9: Tracking app lifecycle events
export const trackAppLifecycle = (
  event: 'opened' | 'backgrounded' | 'foregrounded',
) => {
  const eventName =
    event === 'opened'
      ? AnalyticsEvents.APP_OPENED
      : event === 'backgrounded'
        ? AnalyticsEvents.APP_BACKGROUNDED
        : 'App Foregrounded';

  mixpanelService.track(eventName, {
    timestamp: new Date().toISOString(),
  });
};

// Example 10: Tracking user engagement metrics
export const trackEngagement = (metrics: {
  dailyActiveMinutes: number;
  tasksCompletedToday: number;
  coursesActive: number;
  streakDays: number;
}) => {
  mixpanelService.track('User Engagement', {
    daily_active_minutes: metrics.dailyActiveMinutes,
    tasks_completed_today: metrics.tasksCompletedToday,
    courses_active: metrics.coursesActive,
    streak_days: metrics.streakDays,
  });
};
