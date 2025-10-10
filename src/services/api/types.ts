import { Course, Assignment, Lecture, StudySession } from '../../types';

// --- Request Payloads for Mutations ---

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
  description: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurring_pattern: string;
  reminders: number[];
}

export interface CreateCourseRequest {
  course_name: string;
  course_code?: string;
  about_course?: string;
}

// --- Response Payloads (if they differ from the main types) ---
// For now, we can assume the responses match the main types in `src/types/index.ts`.
// We can add specific response types here later if needed.
