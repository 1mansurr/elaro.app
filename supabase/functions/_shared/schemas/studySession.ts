import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

export const CreateStudySessionSchema = z.object({
  course_id: z.string().uuid('Invalid course ID format'),
  topic: z.string().min(1, 'Topic is required').max(200, 'Topic too long'),
  notes: z.string().max(5000, 'Notes too long').optional(),
  session_date: z.string().datetime('Invalid session date format'),
  has_spaced_repetition: z.boolean().default(false),
  reminders: z.array(z.number().int().min(0)).max(10, 'Maximum 10 reminders allowed').optional(),
});

export const UpdateStudySessionSchema = z.object({
  session_id: z.string().uuid('Invalid session ID format'),
  topic: z.string().min(1, 'Topic is required').max(200, 'Topic too long').optional(),
  notes: z.string().max(5000, 'Notes too long').optional(),
  session_date: z.string().datetime('Invalid session date format').optional(),
  has_spaced_repetition: z.boolean().optional(),
});

export const DeleteStudySessionSchema = z.object({
  session_id: z.string().uuid('Invalid session ID format'),
});
