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
  subscription_status?: 'active' | 'past_due' | 'canceled' | null;
  subscription_expires_at: string | null; // For actual subscriptions, not trials
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
  venue?: string;
  createdAt: string;
}

export type RecurringReminder =
  | 'daily'
  | 'every_3_days'
  | 'weekly'
  | 'biweekly';

export interface StudySession {
  id: string;
  userId: string;
  courseId: string;
  topic: string;
  description?: string;
  sessionDate: string;
  hasSpacedRepetition: boolean;
  recurringReminder?: RecurringReminder | null;
  recurringReminderEndDate?: string | null;
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
  type: 'lecture' | 'study_session' | 'assignment' | 'custom' | string;
  date: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  status?: 'pending' | 'completed';
  name: string;
  title?: string; // Alias for name, used in some components
  courses: { courseName: string };
  isLocked?: boolean;
  color?: string; // populated for custom types from task_types.color
  task_type_id?: string | null;
};

// ─────────────────────────────────────────────────────────────
// 🎨 Custom Task Types
// ─────────────────────────────────────────────────────────────

export type CustomFieldType = 'datetime' | 'checkbox' | 'location' | 'url';

export interface CustomField {
  id: string;
  label: string;
  fieldType: CustomFieldType;
}

export interface TaskTypeDefinition {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  fields: CustomField[];
  created_at: string;
  updated_at: string;
}

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
  todaysTasks: Task[];
  upcomingTasks: Task[];
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
// 📖 Library Types
// ─────────────────────────────────────────────────────────────

export interface Bank {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export interface BankWithCount extends Bank {
  quiz_count: number;
}

export interface Quiz {
  id: string;
  user_id: string;
  bank_id: string | null;
  name: string;
  subject: string;
  color: string;
  total_questions: number;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export interface Question {
  id: string;
  quiz_id: string;
  position: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  correct_option: string;
  explanation: string;
  question_type: 'multiple_choice' | 'true_false';
  created_at: string;
  synced_at: string | null;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total: number;
  percentage: number;
  is_retake: number; // 0 | 1
  attempted_at: string;
  synced_at: string | null;
}

export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option: string | null;
  is_correct: number; // 0 | 1
  synced_at: string | null;
}

export interface QuizStats {
  total_attempts: number;
  best_score: number;
  best_total: number;
  best_percentage: number;
  avg_percentage: number;
}

// ─────────────────────────────────────────────────────────────
// ❗ Error Types
// ─────────────────────────────────────────────────────────────

export interface AppError {
  message: string;
  code?: string;
  details?: any;
}
