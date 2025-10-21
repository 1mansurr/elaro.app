import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Schema for creating a new lecture
export const CreateLectureSchema = z.object({
  course_id: z.string().uuid('Invalid course ID format'),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  description: z.string()
    .max(5000, 'Description must be 5000 characters or less')
    .optional(),
  lecture_date: z.string().datetime('Invalid lecture date format'),
  location: z.string()
    .max(200, 'Location must be 200 characters or less')
    .optional(),
  reminders: z.array(
    z.number().int().positive()
  ).optional(),
});

// Schema for updating a lecture
export const UpdateLectureSchema = z.object({
  lecture_id: z.string().uuid('Invalid lecture ID format'),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .optional(),
  description: z.string()
    .max(5000, 'Description must be 5000 characters or less')
    .optional(),
  lecture_date: z.string().datetime('Invalid lecture date format').optional(),
  location: z.string()
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
