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
  timezone?: string;
  role: 'user' | 'admin';
  onboarding_completed: boolean;
  subscription_tier: 'free' | 'oddity' | null;
  subscription_status?: 'trialing' | 'active' | 'past_due' | 'canceled' | null;
  subscription_expires_at: string | null;
  account_status: 'active' | 'deleted' | 'suspended';
  deleted_at: string | null;
  deletion_scheduled_at: string | null;
  suspension_end_date: string | null;
  last_data_export_at?: string | null;
  failed_login_attempts?: number;
  locked_until?: string | null;
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
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  preferred_morning_time?: string;
  preferred_evening_time?: string;
  weekend_notifications_enabled?: boolean;
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
  difficulty_rating?: number | null;
  confidence_level?: number | null;
  time_spent_minutes?: number | null;
  last_reviewed_at?: string | null;
  review_count?: number;
  createdAt: string;
  deletedAt?: string | null;
}

// ─────────────────────────────────────────────────────────────
// 📋 Task & Workflow Types
// ─────────────────────────────────────────────────────────────

export type Task = {
  id: string;
  type: 'lecture' | 'study_session' | 'assignment';
  date: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  status?: 'pending' | 'completed';
  name: string;
  title?: string; // Alias for name, used in some components
  courses: { courseName: string };
  isLocked?: boolean; // NEW: Indicates if task is locked due to subscription limits
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
  monthlyTaskCount: number;
}

// ─────────────────────────────────────────────────────────────
// 📅 Calendar Data Types
// ─────────────────────────────────────────────────────────────

export interface CalendarData {
  [date: string]: Task[];
}

// ─────────────────────────────────────────────────────────────
// 🔔 Reminder & Notification Types
// ─────────────────────────────────────────────────────────────

export interface Reminder {
  id: string;
  user_id: string;
  session_id?: string | null;
  assignment_id?: string | null;
  lecture_id?: string | null;
  reminder_time: string;
  reminder_type:
    | 'study_session'
    | 'lecture'
    | 'assignment'
    | 'spaced_repetition';
  title?: string | null;
  body?: string | null;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  sent_at?: string | null;
  opened_at?: string | null;
  dismissed_at?: string | null;
  action_taken?: string | null;
  snoozed_until?: string | null;
  processed_at?: string | null;
  created_at: string;
}

export interface SRSPerformance {
  id: string;
  user_id: string;
  session_id: string;
  reminder_id?: string | null;
  review_date: string;
  quality_rating: number; // 0-5
  response_time_seconds?: number | null;
  ease_factor: number;
  interval_days: number;
  next_interval_days?: number | null;
  repetition_number: number;
  created_at: string;
}

export interface ReminderAnalytics {
  id: string;
  user_id: string;
  reminder_id?: string | null;
  reminder_type: string;
  scheduled_time: string;
  sent_time?: string | null;
  opened: boolean;
  time_to_action?: number | null;
  action_taken?: string | null;
  effectiveness_score?: number | null;
  hour_of_day?: number | null;
  day_of_week?: number | null;
  created_at: string;
}

export interface LoginHistory {
  id: string;
  user_id: string;
  success: boolean;
  method: string;
  ip_address?: string | null;
  user_agent?: string | null;
  device_info?: any;
  location?: string | null;
  session_id?: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// ❗ Error Types
// ─────────────────────────────────────────────────────────────

export interface AppError {
  message: string;
  code?: string;
  details?: any;
}
