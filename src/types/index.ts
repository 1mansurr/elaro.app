// 🌟 ELARO v1 — Global TypeScript Definitions

// ─────────────────────────────────────────────────────────────
// 🧑‍💻 User & Auth Types
// ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name?: string;
  is_subscribed_to_oddity: boolean;
  timezone?: string;
  created_at: string;
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
// 📚 Study Session Types
// ─────────────────────────────────────────────────────────────

export interface StudySession {
  id: string;
  user_id: string;
  course: string;
  topic: string;
  date_time: string;
  color: ColorOption;
  spaced_repetition_enabled: boolean;
  reminders: ReminderTime[];
  completed: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// 📅 Task & Event Types
// ─────────────────────────────────────────────────────────────

export interface TaskEvent {
  id: string;
  user_id: string;
  type: 'assignment' | 'exam' | 'lecture' | 'program' | 'other';
  title: string;
  date_time: string;
  color: ColorOption;
  reminders: ReminderTime[];
  repeat_pattern?: RepeatPattern;
  completed: boolean;
  created_at: string;
}

export type ReminderTime = '15min' | '30min' | '1hr' | '24hr';

export interface RepeatPattern {
  type: 'daily' | 'weekly' | 'custom';
  days?: number[]; // 0–6 (Sunday = 0)
  end_date?: string;
}

// ─────────────────────────────────────────────────────────────
// 🧠 Spaced Repetition Types
// ─────────────────────────────────────────────────────────────

export interface SpacedRepetitionReminder {
  id: string;
  user_id: string;
  session_id: string;
  day_offset: number;
  scheduled_date: string;
  completed: boolean;
  is_active: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// 🔥 Streak Types
// ─────────────────────────────────────────────────────────────

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// 📈 Analytics Types
// ─────────────────────────────────────────────────────────────

export interface UserEvent {
  id: string;
  user_id: string;
  event_type:
    | 'app_open'
    | 'add_session'
    | 'add_task'
    | 'mark_complete'
    | 'upgrade_attempt'
    | 'upgrade_success'
    | (string & {}); // fallback for future types
  metadata?: Record<string, any>;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// 💳 Subscription Types
// ─────────────────────────────────────────────────────────────

export interface Subscription {
  user_id: string;
  is_subscribed_to_oddity: boolean;
  subscription_started_at?: string;
  subscription_expires_at?: string;
  payment_status: 'active' | 'cancelled' | 'failed';
}

// ─────────────────────────────────────────────────────────────
// 📦 Plan Types
// ─────────────────────────────────────────────────────────────

export interface Plan {
  name: 'origin' | 'oddity';
  price: number;
  weeklyLimit?: number;
  totalLimit?: number;
  srLimit: number;
  guideAccess: boolean;
}

export const PLANS: Readonly<Record<string, Plan>> = {
  origin: {
    name: 'origin',
    price: 0,
    weeklyLimit: 14,
    srLimit: 30,
    guideAccess: false,
  },
  oddity: {
    name: 'oddity',
    price: 5,
    totalLimit: 35,
    srLimit: 75,
    guideAccess: true,
  },
};

// ─────────────────────────────────────────────────────────────
// 🧩 UI Component Types
// ─────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  action: () => void;
}

export interface CalendarItem {
  id: string;
  title: string;
  type: 'session' | 'task' | 'event';
  date: Date;
  time?: string;
  color: ColorOption;
  spacedRepetition?: boolean;
  completed: boolean;
}

// ─────────────────────────────────────────────────────────────
// 📘 Study Guide Types
// ─────────────────────────────────────────────────────────────

export interface GuideSection {
  id: string;
  title: string;
  emoji: string;
  content?: string;
  locked: boolean;
}

// ─────────────────────────────────────────────────────────────
// 🧠 Learning Style Quiz Types
// ─────────────────────────────────────────────────────────────

export interface LearningStylePrompt {
  type: 'quick' | 'deep';
  title: string;
  description: string;
  prompt: string;
}

// ─────────────────────────────────────────────────────────────
// 🎨 Color & UI Constants
// ─────────────────────────────────────────────────────────────

export type ColorOption =
  | 'green'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'yellow'
  | 'pink'
  | 'red'
  | 'gray';

// ─────────────────────────────────────────────────────────────
// 🧭 Navigation Types
// ─────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Launch: undefined;
  ExplainerVideo: undefined;
  Main: undefined;
  Auth: { onClose?: () => void };
  PushTest: undefined;
  Settings: undefined;
  GuideSection: undefined;
  AddStudy: undefined;
  AddEvent: undefined;
  AddTaskEvent: undefined;
  LearningStyleScreen: undefined;
  SpacedRepetitionScreen: undefined;
  ScheduleSR: undefined;
  HelpAndFeedback: undefined;
  TermsOfUse: undefined;
  PrivacyPolicy: undefined;
  TawkChat: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Account: undefined;
};

// ─────────────────────────────────────────────────────────────
// 🪟 Modal Props
// ─────────────────────────────────────────────────────────────

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────
// 📋 Form Input Types
// ─────────────────────────────────────────────────────────────

export interface AddSessionForm {
  course: string;
  topic: string;
  dateTime: Date;
  color: ColorOption;
  spacedRepetition: boolean;
  reminders: ReminderTime[];
}

export interface AddTaskForm {
  type: TaskEvent['type'];
  title: string;
  dateTime: Date;
  color: ColorOption;
  reminders: ReminderTime[];
  repeatPattern?: RepeatPattern;
  /**
   * Type-specific fields for assignment, exam, lecture, program, meeting, etc.
   * Structure:
   * - assignment: { courseName?: string; description?: string; fileLink?: string; }
   * - exam: { course?: string; examType?: string; location?: string; studyReminder?: boolean; spacedRepetition?: boolean; }
   * - lecture: { courseOrTopic?: string; lecturer?: string; locationOrLink?: string; repeatPattern?: RepeatPattern; endDate?: Date; }
   * - program: { programTitle?: string; link?: string; organizer?: string; duration?: { start: Date; end: Date } }
   * - meeting: { purpose?: string; withWho?: string; locationOrLink?: string; repeat?: RepeatPattern; meetingNotes?: string; }
   */
  details?: Record<string, any>;
}

// ─────────────────────────────────────────────────────────────
// ⚙️ Settings Types
// ─────────────────────────────────────────────────────────────

export interface AppSettings {
  notificationsEnabled: boolean;
  defaultReminderTimes: ReminderTime[];
  language: 'en';
  colorPalette: ColorOption[];
}

// ─────────────────────────────────────────────────────────────
// ❗ Error Types
// ─────────────────────────────────────────────────────────────

export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

