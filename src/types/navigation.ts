// 🧭 Navigation Types
// ─────────────────────────────────────────────────────────────

import { Task, Course } from './entities';

// Type for initial data that can be passed to flow screens
export type FlowInitialData = {
  course?: Course;
  title?: string;
  dateTime?: Date | string;
  taskToEdit?: Task | null; // Task being edited (optional)
  [key: string]: unknown;
};

export type RootStackParamList = {
  // Core navigation
  Launch: undefined;
  AppWelcome: undefined;
  Auth: {
    onClose?: () => void;
    onAuthSuccess?: () => void;
    mode?: 'signup' | 'signin';
  };
  Main: undefined;
  OnboardingFlow: undefined;
  PostOnboardingWelcome: undefined;
  AddCourseFirst: undefined;

  // Core app screens
  Courses: undefined;
  Drafts: undefined;
  Templates: undefined;
  CourseDetail: { courseId: string };
  Calendar: undefined;
  RecycleBin: undefined;
  Profile: undefined;
  Settings: undefined;
  NotificationManagement: undefined;

  // Account management screens (names match navigator registrations)
  DeleteAccountScreen: undefined;
  DeviceManagement: undefined;
  LoginHistory: undefined;

  // Auth-related screens
  MFAEnrollmentScreen: undefined;
  MFAVerificationScreen: { factorId: string };
  ForgotPassword: undefined;
  ResetPassword: undefined;

  // Modal flows (can accept optional initialData)
  AddCourseFlow: { initialData?: FlowInitialData } | undefined;
  AddLectureFlow: { initialData?: FlowInitialData } | undefined;
  AddAssignmentFlow: { initialData?: FlowInitialData } | undefined;
  AddStudySessionFlow: { initialData?: FlowInitialData } | undefined;

  // Other modals
  EditCourseModal: { courseId: string };
  TaskDetailModal: {
    taskId: string;
    taskType: 'study_session' | 'lecture' | 'assignment';
  };
  InAppBrowserScreen: {
    url: string;
    title?: string;
  };

  // Special screens
  AnalyticsAdmin: undefined;
  PaywallScreen:
    | { variant?: 'locked' | 'general'; lockedContent?: string }
    | undefined;
  OddityWelcomeScreen: {
    variant:
      | 'direct'
      | 'renewal'
      | 'restore'
      | 'promo'
      | 'granted'
      | 'plan-change'
      | 'trial-early'
      | 'trial-expired';
  };
  StudyResult: { sessionId: string };
  StudySessionReview: { sessionId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Account: undefined;
};
