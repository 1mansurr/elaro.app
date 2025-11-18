import { z } from 'zod';

export const CreateTemplateSchema = z.object({
  template_name: z.string().min(1),
  task_type: z.enum(['assignment', 'lecture', 'study_session']),
  template_data: z.record(z.any()),
});

export const UpdateTemplateSchema = z.object({
  id: z.string().uuid(),
  template_name: z.string().min(1).optional(),
  template_data: z.record(z.any()).optional(),
});

export const DeleteTemplateSchema = z.object({
  id: z.string().uuid(),
});
