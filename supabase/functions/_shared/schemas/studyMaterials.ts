import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

export const CreateTemplateSchema = z.object({
  template_name: z.string().min(1),
  task_type: z.enum(['assignment', 'lecture', 'study_session']),
  template_data: z.record(z.any()),
  is_public: z.boolean().default(false),
});

export const UpdateTemplateSchema = z.object({
  template_name: z.string().min(1).optional(),
  template_data: z.record(z.any()).optional(),
  is_public: z.boolean().optional(),
});

export const DeleteTemplateSchema = z.object({
  template_id: z.string().uuid(),
});

export const ApplyTemplateSchema = z.object({
  template_id: z.string().uuid(),
  course_id: z.string().uuid(),
  customizations: z.record(z.any()).optional(),
});

export const ShareMaterialsSchema = z.object({
  material_id: z.string().uuid(),
  share_with_users: z.array(z.string().uuid()),
  share_level: z.enum(['read', 'write']).default('read'),
});
