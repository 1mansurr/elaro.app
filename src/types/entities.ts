// 🏗️ Core Data Model Types
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// 🧑‍💻 User & Auth Types
// ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  country?: string;
  university?: string;
  program?: string;
  role: 'user' | 'admin';
  onboarding_completed: boolean;
  subscription_tier: 'free' | 'oddity' | null;
  subscription_status?: 'trialing' | 'active' | 'past_due' | 'canceled' | null;
  subscription_expires_at: string | null;
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

export interface NotificationPreferences {
  user_id: string;
  reminders_enabled: boolean;
  srs_reminders_enabled: boolean;
  assignment_reminders_enabled: boolean;
  lecture_reminders_enabled: boolean;
  morning_summary_enabled: boolean;
  evening_capture_enabled: boolean;
  updated_at: string;
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
// 📚 Course & Educational Content Types
// ─────────────────────────────────────────────────────────────

export interface Course {
  id: string;
  courseName: string;
  courseCode?: string;
  aboutCourse?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Assignment {
  id: string;
  userId: string;
  courseId: string;
  title: string;
  description?: string;
  submissionMethod?: string;
  submissionLink?: string;
  dueDate: string;
  createdAt: string;
}

export interface Lecture {
  id: string;
  userId: string;
  courseId: string;
  lectureDate: string;
  isRecurring: boolean;
  recurringPattern?: string;
  lectureName?: string;
  description?: string;
  createdAt: string;
}

export interface StudySession {
  id: string;
  userId: string;
  courseId: string;
  topic: string;
  description?: string;
  sessionDate: string;
  hasSpacedRepetition: boolean;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// 📋 Task & Workflow Types
// ─────────────────────────────────────────────────────────────

export type Task = {
  id: string;
  type: 'lecture' | 'study_session' | 'assignment';
  date: string; // This might be start_time now
  startTime?: string;
  endTime?: string; // Add this
  description?: string; // Add this
  status?: 'pending' | 'completed'; // Add this
  name: string;
  courses: { courseName: string };
  // Add other potential shared fields here
};

// ─────────────────────────────────────────────────────────────
// 🏠 Home Screen Data Types
// ─────────────────────────────────────────────────────────────

export interface OverviewData {
  lectures: number;
  studySessions: number;
  assignments: number;
  reviews: number;
}

export interface HomeScreenData {
  nextUpcomingTask: Task | null;
  todayOverview: OverviewData | null;
  weeklyTaskCount: number;
}

// ─────────────────────────────────────────────────────────────
// 📅 Calendar Data Types
// ─────────────────────────────────────────────────────────────

export interface CalendarData {
  [date: string]: Task[];
}

// ─────────────────────────────────────────────────────────────
// ❗ Error Types
// ─────────────────────────────────────────────────────────────

export interface AppError {
  message: string;
  code?: string;
  details?: any;
}
