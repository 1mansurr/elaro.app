export const AnalyticsEvents = {
  // User Lifecycle
  USER_SIGNED_UP: 'User Signed Up',
  SIGN_UP_PROMPTED: 'Sign Up Prompted',
  USER_ONBOARDING_COMPLETED: 'Onboarding Completed',
  USER_LOGGED_IN: 'User Logged In',
  USER_LOGGED_OUT: 'User Logged Out',

  // Academic Content
  COURSE_CREATED: 'Course Created',
  COURSE_DELETED: 'Course Deleted',
  ASSIGNMENT_CREATED: 'Assignment Created',
  ASSIGNMENT_COMPLETED: 'Assignment Completed',
  LECTURE_CREATED: 'Lecture Created',
  LECTURE_ATTENDED: 'Lecture Attended',

  // Study Sessions
  STUDY_SESSION_CREATED: 'Study Session Created',
  STUDY_SESSION_COMPLETED: 'Study Session Completed',
  STUDY_SESSION_SKIPPED: 'Study Session Skipped',
  SPACED_REPETITION_ENABLED: 'Spaced Repetition Enabled',

  // Task Management
  TASK_DETAILS_VIEWED: 'Task Details Viewed',

  // Subscription & Payments
  SUBSCRIPTION_STARTED: 'Subscription Started',
  SUBSCRIPTION_CANCELLED: 'Subscription Cancelled',
  PAYMENT_COMPLETED: 'Payment Completed',
  TRIAL_STARTED: 'Trial Started',
  TRIAL_CONVERTED: 'Trial Converted',

  // Feature Usage
  CALENDAR_VIEWED: 'Calendar Viewed',
  HOME_SCREEN_VIEWED: 'Home Screen Viewed',
  SCREEN_VIEWED: 'Screen Viewed',
  NOTIFICATION_RECEIVED: 'Notification Received',
  NOTIFICATION_OPENED: 'Notification Opened',
  SETTINGS_VIEWED: 'Settings Viewed',

  // App Performance
  APP_OPENED: 'App Opened',
  APP_BACKGROUNDED: 'App Backgrounded',
  ERROR_OCCURRED: 'Error Occurred',

  // Privacy & Analytics
  ANALYTICS_CONSENT_CHANGED: 'Analytics Consent Changed',
} as const;

export type AnalyticsEvent =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];
