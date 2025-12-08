import { z } from 'zod';

// Schema for creating a new lecture
export const CreateLectureSchema = z.object({
  course_id: z.string().uuid('Invalid course ID format'),
  lecture_name: z
    .string()
    .min(1, 'Lecture name is required')
    .max(35, 'Lecture name must be 35 characters or less'),
  description: z
    .string()
    .max(5000, 'Description must be 5000 characters or less')
    .optional(),
  start_time: z.string().datetime('Invalid start time format'),
  end_time: z.string().datetime('Invalid end time format').optional(),
  is_recurring: z.boolean().optional(),
  recurring_pattern: z.string().optional(),
  venue: z.string().max(200, 'Venue must be 200 characters or less').optional(),
  reminders: z.array(z.number().int().positive()).optional(),
});

// Schema for updating a lecture
export const UpdateLectureSchema = z.object({
  lecture_id: z.string().uuid('Invalid lecture ID format'),
  lecture_name: z
    .string()
    .min(1, 'Lecture name is required')
    .max(35, 'Lecture name must be 35 characters or less')
    .optional(),
  description: z
    .string()
    .max(5000, 'Description must be 5000 characters or less')
    .optional(),
  start_time: z.string().datetime('Invalid start time format').optional(),
  end_time: z.string().datetime('Invalid end time format').optional(),
  is_recurring: z.boolean().optional(),
  recurring_pattern: z.string().optional(),
  location: z
    .string()
    .max(200, 'Location must be 200 characters or less')
    .optional(),
});

// Schema for deleting a lecture
export const DeleteLectureSchema = z.object({
  lecture_id: z.string().uuid('Invalid lecture ID format'),
});

// Schema for restoring a lecture
export const RestoreLectureSchema = z.object({
  lecture_id: z.string().uuid('Invalid lecture ID format'),
});
