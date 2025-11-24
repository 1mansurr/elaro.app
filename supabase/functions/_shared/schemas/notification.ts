import { z } from 'zod';

// Schema for sending a notification
export const SendNotificationSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be 100 characters or less'),
  body: z
    .string()
    .min(1, 'Body is required')
    .max(500, 'Body must be 500 characters or less'),
  data: z.record(z.any()).optional(),
});

// Schema for scheduling a notification
export const ScheduleNotificationSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be 100 characters or less'),
  body: z
    .string()
    .min(1, 'Body is required')
    .max(500, 'Body must be 500 characters or less'),
  scheduled_at: z.string().datetime('Invalid scheduled time format'),
  data: z.record(z.any()).optional(),
});

// Schema for canceling a notification
export const CancelNotificationSchema = z.object({
  reminder_id: z.string().uuid('Invalid reminder ID format'),
});
