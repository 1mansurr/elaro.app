import { z } from 'https://deno.land/x/zod/mod.ts';

export const CreateCourseAndLectureSchema = z.object({
  courseName: z.string().min(1, 'Course name is required').max(200),
  courseCode: z.string().max(20).optional(),
  courseDescription: z.string().max(5000).optional(),
  startTime: z.string().datetime('Invalid start time format'),
  endTime: z.string().datetime('Invalid end time format'),
  recurrence: z.enum(['none', 'weekly', 'bi-weekly']),
  reminders: z.array(z.number().int().min(0)).optional(),
});
