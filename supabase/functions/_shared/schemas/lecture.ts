import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

export const CreateLectureSchema = z.object({
  course_id: z.string().uuid('Invalid course ID format'),
  lecture_name: z.string().min(1, 'Lecture name is required').max(200, 'Lecture name too long'),
  start_time: z.string().datetime('Invalid start time format'),
  end_time: z.string().datetime('Invalid end time format').optional(),
  description: z.string().max(5000, 'Description too long').optional(),
  is_recurring: z.boolean().default(false),
  recurring_pattern: z.string().max(50).optional(),
  reminders: z.array(z.number().int().min(0)).max(10, 'Maximum 10 reminders allowed').optional(),
});

export const UpdateLectureSchema = z.object({
  lecture_id: z.string().uuid('Invalid lecture ID format'),
  lecture_name: z.string().min(1, 'Lecture name is required').max(200, 'Lecture name too long').optional(),
  start_time: z.string().datetime('Invalid start time format').optional(),
  end_time: z.string().datetime('Invalid end time format').optional(),
  description: z.string().max(5000, 'Description too long').optional(),
  is_recurring: z.boolean().optional(),
  recurring_pattern: z.string().max(50).optional(),
});

export const DeleteLectureSchema = z.object({
  lecture_id: z.string().uuid('Invalid lecture ID format'),
});
