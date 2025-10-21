import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Schema for creating a new assignment
export const CreateAssignmentSchema = z.object({
  course_id: z.string().uuid('Invalid course ID format'),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  description: z.string()
    .max(5000, 'Description must be 5000 characters or less')
    .optional(),
  due_date: z.string().datetime('Invalid due date format. Must be ISO 8601 datetime string'),
  submission_method: z.enum(['online', 'in-person'], {
    errorMap: () => ({ message: 'Submission method must be either "online" or "in-person"' })
  }).optional(),
  submission_link: z.string()
    .url('Invalid URL format')
    .optional()
    .or(z.literal('')),
  reminders: z.array(
    z.number()
      .int('Reminder minutes must be an integer')
      .positive('Reminder minutes must be positive')
  ).optional(),
});

// Schema for updating an assignment
export const UpdateAssignmentSchema = z.object({
  assignment_id: z.string().uuid('Invalid assignment ID format'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  description: z.string().max(5000, 'Description too long').optional(),
  due_date: z.string().datetime('Invalid due date format').optional(),
  submission_method: z.enum(['online', 'in-person']).optional(),
  submission_link: z.string().url('Invalid submission link format').optional().or(z.literal('')),
});

// Schema for deleting an assignment
export const DeleteAssignmentSchema = z.object({
  assignment_id: z.string().uuid('Invalid assignment ID format'),
});

// Schema for restoring an assignment
export const RestoreAssignmentSchema = z.object({
  assignment_id: z.string().uuid('Invalid assignment ID format'),
});
