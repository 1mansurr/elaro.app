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
  Main: undefined;
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
  Library: undefined;
};

export type LibraryStackParamList = {
  LibraryScreen: undefined;
  QuizDetail: { quizId: string };
  QuizTaking: {
    quizId: string;
    mode: 'full' | 'retake';
    wrongQuestionIds?: string[];
  };
  Results: {
    attemptId: string;
    quizId: string;
    score: number;
    total: number;
    percentage: number;
  };
  QuizPreview: {
    parsedQuiz: {
      subject: string;
      questions: Array<{
        id: number;
        question: string;
        options: { A: string; B: string; C?: string; D?: string };
        correct_option: string;
        explanation: string;
        flagged: boolean;
        flag_reason?: string;
      }>;
    };
    quizName: string;
    color: string;
  };
};
