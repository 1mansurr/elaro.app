// 🌟 ELARO v1 — Global TypeScript Definitions

// ─────────────────────────────────────────────────────────────
// 🧑‍💻 User & Auth Types
// ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  university?: string;
  program?: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    name?: string;
    university?: string;
    program?: string;
  };
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// 🧭 Navigation Types
// ─────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Launch: undefined;
  AuthChooser: undefined;
  Auth: { onClose: () => void; onAuthSuccess?: () => void; mode?: 'signup' | 'signin' };
  Main: undefined;
  Welcome: { firstName?: string; lastName?: string; } | undefined;
  OnboardingForm: { newCourse?: { course_name: string; course_code: string; about_course: string; }; firstName?: string; lastName?: string; } | undefined;
  AddCourseOnboardingModal: undefined;
  Courses: undefined;
  CourseDetail: { courseId: string };
  Calendar: undefined;
  ComingSoon: undefined;
  RecycleBin: undefined;
  AddCourseModal: undefined;
  EditCourseModal: { courseId: string };
  AddLectureModal: undefined;
  AddStudySessionModal: undefined;
  AddAssignmentModal: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Account: undefined;
};

// ─────────────────────────────────────────────────────────────
// 📚 Course Types
// ─────────────────────────────────────────────────────────────

export interface Course {
  id: string;
  course_name: string;
  course_code?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// 📋 Task Types
// ─────────────────────────────────────────────────────────────

export type Task = {
  id: string;
  type: 'lecture' | 'study_session' | 'assignment';
  date: string;
  name: string;
  courses: { course_name: string };
  // Add other potential shared fields here
};

// ─────────────────────────────────────────────────────────────
// ❗ Error Types
// ─────────────────────────────────────────────────────────────

export interface AppError {
  message: string;
  code?: string;
  details?: any;
}
