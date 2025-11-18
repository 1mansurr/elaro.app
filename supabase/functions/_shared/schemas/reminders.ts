import { z } from 'zod';

export const ScheduleRemindersSchema = z.object({
  session_id: z.string().uuid('Invalid session ID format'),
  session_date: z.string().datetime('Invalid session date format'),
  topic: z.string().min(1, 'Topic is required').max(200, 'Topic too long'),
});
