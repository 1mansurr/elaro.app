import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

export const ScheduleRemindersSchema = z.object({
  session_id: z.string().uuid('Invalid session ID format'),
  session_date: z.string().datetime('Invalid session date format'),
  topic: z.string().min(1, 'Topic is required').max(200, 'Topic too long'),
});
