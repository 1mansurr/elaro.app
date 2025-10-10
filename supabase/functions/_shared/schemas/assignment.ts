import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

export const UpdateAssignmentSchema = z.object({
  assignment_id: z.string().uuid('Invalid assignment ID format'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  description: z.string().max(5000, 'Description too long').optional(),
  due_date: z.string().datetime('Invalid due date format').optional(),
  submission_method: z.enum(['online', 'in-person']).optional(),
  submission_link: z.string().url('Invalid submission link format').optional().or(z.literal('')),
});

export const DeleteAssignmentSchema = z.object({
  assignment_id: z.string().uuid('Invalid assignment ID format'),
});
