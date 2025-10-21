import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Schema for creating a new course
export const CreateCourseSchema = z.object({
  course_name: z.string()
    .min(1, 'Course name is required')
    .max(200, 'Course name must be 200 characters or less'),
  course_code: z.string()
    .max(50, 'Course code must be 50 characters or less')
    .optional(),
  about_course: z.string()
    .max(2000, 'About course must be 2000 characters or less')
    .optional(),
});

// Schema for updating a course
export const UpdateCourseSchema = z.object({
  course_id: z.string().uuid('Invalid course ID format'),
  course_name: z.string()
    .min(1, 'Course name is required')
    .max(200, 'Course name must be 200 characters or less')
    .optional(),
  course_code: z.string()
    .max(50, 'Course code must be 50 characters or less')
    .optional(),
  about_course: z.string()
    .max(2000, 'About course must be 2000 characters or less')
    .optional(),
});

// Schema for deleting a course
export const DeleteCourseSchema = z.object({
  course_id: z.string().uuid('Invalid course ID format'),
});

// Schema for restoring a course
export const RestoreCourseSchema = z.object({
  course_id: z.string().uuid('Invalid course ID format'),
});
