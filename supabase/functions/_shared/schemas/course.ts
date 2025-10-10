import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

export const UpdateCourseSchema = z.object({
  course_id: z.string().uuid('Invalid course ID format'),
  course_name: z.string().min(1, 'Course name is required').max(200, 'Course name too long').optional(),
  course_code: z.string().max(50, 'Course code too long').optional(),
  about_course: z.string().max(5000, 'About course description too long').optional(),
});

export const DeleteCourseSchema = z.object({
  course_id: z.string().uuid('Invalid course ID format'),
});
