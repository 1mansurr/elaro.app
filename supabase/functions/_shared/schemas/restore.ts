import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

/**
 * Compatibility schemas for restore operations.
 * Accepts both camelCase (legacy) and snake_case (new) field names for backward compatibility.
 */

// Schema for restoring an assignment (accepts both assignmentId and assignment_id)
export const RestoreAssignmentSchema = z
  .object({
    assignment_id: z.string().uuid('Invalid assignment ID format').optional(),
    assignmentId: z.string().uuid('Invalid assignment ID format').optional(),
  })
  .refine(data => data.assignment_id || data.assignmentId, {
    message: 'Either assignment_id or assignmentId is required',
  })
  .transform(data => ({
    assignment_id: data.assignment_id || data.assignmentId!,
  }));

// Schema for restoring a lecture (accepts both lectureId and lecture_id)
export const RestoreLectureSchema = z
  .object({
    lecture_id: z.string().uuid('Invalid lecture ID format').optional(),
    lectureId: z.string().uuid('Invalid lecture ID format').optional(),
  })
  .refine(data => data.lecture_id || data.lectureId, {
    message: 'Either lecture_id or lectureId is required',
  })
  .transform(data => ({
    lecture_id: data.lecture_id || data.lectureId!,
  }));

// Schema for restoring a course (accepts both courseId and course_id)
export const RestoreCourseSchema = z
  .object({
    course_id: z.string().uuid('Invalid course ID format').optional(),
    courseId: z.string().uuid('Invalid course ID format').optional(),
  })
  .refine(data => data.course_id || data.courseId, {
    message: 'Either course_id or courseId is required',
  })
  .transform(data => ({
    course_id: data.course_id || data.courseId!,
  }));

// Schema for restoring a study session (accepts both studySessionId and study_session_id)
export const RestoreStudySessionSchema = z
  .object({
    study_session_id: z
      .string()
      .uuid('Invalid study session ID format')
      .optional(),
    studySessionId: z
      .string()
      .uuid('Invalid study session ID format')
      .optional(),
  })
  .refine(data => data.study_session_id || data.studySessionId, {
    message: 'Either study_session_id or studySessionId is required',
  })
  .transform(data => ({
    study_session_id: data.study_session_id || data.studySessionId!,
  }));
