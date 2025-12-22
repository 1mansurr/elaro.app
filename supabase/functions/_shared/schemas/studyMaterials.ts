import { z } from 'zod';

export const CreateTemplateSchema = z.object({
  template_name: z.string().min(1),
  task_type: z.enum(['assignment', 'lecture', 'study_session']),
  template_data: z.record(z.unknown()),
  is_public: z.boolean().default(false),
});

export const UpdateTemplateSchema = z.object({
  template_name: z.string().min(1).optional(),
  template_data: z.record(z.unknown()).optional(),
  is_public: z.boolean().optional(),
});

export const DeleteTemplateSchema = z.object({
  template_id: z.string().uuid(),
});

export const ApplyTemplateSchema = z.object({
  template_id: z.string().uuid(),
  course_id: z.string().uuid(),
  customizations: z.record(z.unknown()).optional(),
});

export const ShareMaterialsSchema = z.object({
  material_id: z.string().uuid(),
  share_with_users: z.array(z.string().uuid()),
  share_level: z.enum(['read', 'write']).default('read'),
});
