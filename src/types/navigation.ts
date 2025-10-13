// 🧭 Navigation Types
// ─────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Launch: undefined;
  Auth: { onClose: () => void; onAuthSuccess?: () => void; mode?: 'signup' | 'signin' };
  Main: undefined;
  Welcome: { firstName?: string; lastName?: string; } | undefined;
  OnboardingFlow: undefined;
  Courses: undefined;
  CourseDetail: { courseId: string };
  Calendar: undefined;
  RecycleBin: undefined;
  Profile: undefined;
  AddCourseFlow: undefined;
  AddLectureFlow: undefined;
  AddAssignmentFlow: undefined;
  AddStudySessionFlow: undefined;
  EditCourseModal: { courseId: string };
  TaskDetailModal: {
    taskId: string;
    taskType: 'study_session' | 'lecture' | 'assignment';
  };
  MFAEnrollmentScreen: undefined;
  MFAVerificationScreen: { factorId: string };
  InAppBrowserScreen: {
    url: string;
    title?: string;
  };
};

export type MainTabParamList = {
  Home: undefined;
  Account: undefined;
};
