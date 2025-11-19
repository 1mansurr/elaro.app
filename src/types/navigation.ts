// 🧭 Navigation Types
// ─────────────────────────────────────────────────────────────

import { Task } from './entities';

// Type for initial data that can be passed to flow screens
export type FlowInitialData = {
  course?: any;
  title?: string;
  dateTime?: Date | string;
  taskToEdit?: Task | null; // Task being edited (optional)
  [key: string]: any;
};

export type RootStackParamList = {
  // Core navigation
  Launch: undefined;
  Auth: {
    onClose?: () => void;
    onAuthSuccess?: () => void;
    mode?: 'signup' | 'signin';
  };
  Main: undefined;
  OnboardingFlow: undefined;

  // Core app screens
  Courses: undefined;
  Drafts: undefined;
  Templates: undefined;
  CourseDetail: { courseId: string };
  Calendar: undefined;
  RecycleBin: undefined;
  Profile: undefined;
  Settings: undefined;

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
      | 'trial-early'
      | 'trial-expired'
      | 'direct'
      | 'renewal'
      | 'restore'
      | 'promo'
      | 'granted'
      | 'plan-change';
  };
  StudyResult: { sessionId: string };
  StudySessionReview: { sessionId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Account: undefined;
};
