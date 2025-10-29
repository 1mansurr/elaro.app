// 🌐 API Request & Response Types
// ─────────────────────────────────────────────────────────────

import { Course, Assignment, Lecture, StudySession } from './entities';

// ─────────────────────────────────────────────────────────────
// 📝 Request Payloads for Mutations
// ─────────────────────────────────────────────────────────────

export interface CreateAssignmentRequest {
  course_id: string;
  title: string;
  description?: string;
  submission_method?: string;
  submission_link?: string;
  due_date: string;
  reminders: number[];
}

export interface CreateStudySessionRequest {
  course_id: string;
  topic: string;
  notes?: string;
  session_date: string;
  has_spaced_repetition: boolean;
  reminders: number[];
}

export interface CreateLectureRequest {
  course_id: string;
  lecture_name: string;
  description?: string;
  start_time: string;
  end_time?: string;
  is_recurring?: boolean;
  recurring_pattern?: string;
  reminders?: number[];
}

export interface CreateCourseRequest {
  course_name: string;
  course_code?: string;
  about_course?: string;
}

// ─────────────────────────────────────────────────────────────
// 📤 Response Payloads
// ─────────────────────────────────────────────────────────────

// For now, we assume the responses match the main entity types.
// We can add specific response types here later if needed.

export type CreateAssignmentResponse = Assignment;
export type CreateStudySessionResponse = StudySession;
export type CreateLectureResponse = Lecture;
export type CreateCourseResponse = Course;

// ─────────────────────────────────────────────────────────────
// 🔄 Update Request Types
// ─────────────────────────────────────────────────────────────

export interface UpdateCourseRequest {
  course_name?: string;
  course_code?: string;
  about_course?: string;
}

export interface UpdateAssignmentRequest {
  title?: string;
  description?: string;
  submission_method?: string;
  submission_link?: string;
  due_date?: string;
}

export interface UpdateLectureRequest {
  lecture_name?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  is_recurring?: boolean;
  recurring_pattern?: string;
}

export interface UpdateStudySessionRequest {
  topic?: string;
  notes?: string;
  session_date?: string;
  has_spaced_repetition?: boolean;
}

// ─────────────────────────────────────────────────────────────
// 📊 Query Parameter Types
// ─────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface FilterParams {
  course_id?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
}

// ─────────────────────────────────────────────────────────────
// 📈 Analytics & Reporting Types
// ─────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_courses: number;
  total_assignments: number;
  total_lectures: number;
  total_study_sessions: number;
  upcoming_deadlines: number;
  completed_tasks_this_week: number;
}

export interface PerformanceMetrics {
  study_time_minutes: number;
  assignments_completed: number;
  lectures_attended: number;
  spaced_repetition_sessions: number;
  streak_days: number;
}
