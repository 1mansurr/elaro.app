import { z } from 'zod';

// Schema for creating a new study session
export const CreateStudySessionSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  description: z
    .string()
    .max(5000, 'Description must be 5000 characters or less')
    .optional(),
  start_time: z.string().datetime('Invalid start time format'),
  end_time: z.string().datetime('Invalid end time format'),
  location: z
    .string()
    .max(200, 'Location must be 200 characters or less')
    .optional(),
  reminders: z.array(z.number().int().positive()).optional(),
});

// Schema for updating a study session
export const UpdateStudySessionSchema = z.object({
  study_session_id: z.string().uuid('Invalid study session ID format'),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .optional(),
  description: z
    .string()
    .max(5000, 'Description must be 5000 characters or less')
    .optional(),
  start_time: z.string().datetime('Invalid start time format').optional(),
  end_time: z.string().datetime('Invalid end time format').optional(),
  location: z
    .string()
    .max(200, 'Location must be 200 characters or less')
    .optional(),
});

// Schema for deleting a study session
export const DeleteStudySessionSchema = z.object({
  study_session_id: z.string().uuid('Invalid study session ID format'),
});

// Schema for restoring a study session
export const RestoreStudySessionSchema = z.object({
  study_session_id: z.string().uuid('Invalid study session ID format'),
});
