import {
  Course as AppCourse,
  Assignment as AppAssignment,
  Lecture as AppLecture,
  StudySession as AppStudySession,
} from '@/types';

// Raw types representing the data directly from the Supabase DB
type DbCourse = {
  id: string;
  user_id: string;
  course_name: string;
  course_code?: string;
  about_course?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
};

type DbAssignment = {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  description?: string;
  submission_method?: string;
  submission_link?: string;
  due_date: string;
  created_at: string;
};

type DbLecture = {
  id: string;
  user_id: string;
  course_id: string;
  lecture_date: string;
  is_recurring: boolean;
  recurring_pattern?: string;
  lecture_name?: string;
  description?: string;
  created_at: string;
};

type DbStudySession = {
  id: string;
  user_id: string;
  course_id: string;
  topic: string;
  description?: string;
  session_date: string;
  has_spaced_repetition: boolean;
  created_at: string;
};

// Mapper functions to transform database objects to app objects
export const mapDbCourseToAppCourse = (dbCourse: DbCourse): AppCourse => ({
  id: dbCourse.id,
  userId: dbCourse.user_id,
  courseName: dbCourse.course_name,
  courseCode: dbCourse.course_code,
  aboutCourse: dbCourse.about_course,
  createdAt: dbCourse.created_at,
  updatedAt: dbCourse.updated_at,
  deletedAt: dbCourse.deleted_at,
});

export const mapDbAssignmentToAppAssignment = (
  dbAssignment: DbAssignment,
): AppAssignment => ({
  id: dbAssignment.id,
  userId: dbAssignment.user_id,
  courseId: dbAssignment.course_id,
  title: dbAssignment.title,
  description: dbAssignment.description,
  submissionMethod: dbAssignment.submission_method,
  submissionLink: dbAssignment.submission_link,
  dueDate: dbAssignment.due_date,
  createdAt: dbAssignment.created_at,
});

export const mapDbLectureToAppLecture = (dbLecture: DbLecture): AppLecture => ({
  id: dbLecture.id,
  userId: dbLecture.user_id,
  courseId: dbLecture.course_id,
  lectureDate: dbLecture.lecture_date,
  isRecurring: dbLecture.is_recurring,
  recurringPattern: dbLecture.recurring_pattern,
  lectureName: dbLecture.lecture_name,
  description: dbLecture.description,
  createdAt: dbLecture.created_at,
});

export const mapDbStudySessionToAppStudySession = (
  dbStudySession: DbStudySession,
): AppStudySession => ({
  id: dbStudySession.id,
  userId: dbStudySession.user_id,
  courseId: dbStudySession.course_id,
  topic: dbStudySession.topic,
  description: dbStudySession.description,
  sessionDate: dbStudySession.session_date,
  hasSpacedRepetition: dbStudySession.has_spaced_repetition,
  createdAt: dbStudySession.created_at,
});
