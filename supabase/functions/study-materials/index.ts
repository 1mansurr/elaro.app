/**
 * Consolidated Study Materials Edge Function
 * 
 * This function consolidates all study materials and template operations that were previously
 * spread across multiple separate Edge Functions.
 * 
 * Routes:
 * - POST /study-materials/create-template - Create study template
 * - GET /study-materials/templates - List user templates
 * - PUT /study-materials/template/:id - Update template
 * - DELETE /study-materials/template/:id - Delete template
 * - POST /study-materials/apply-template - Apply template to create items
 * - GET /study-materials/materials - Get study materials
 * - POST /study-materials/share - Share study materials
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { createResponse } from '../_shared/response.ts';
import { AppError } from '../_shared/response.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const CreateTemplateSchema = z.object({
  template_name: z.string().min(1),
  task_type: z.enum(['assignment', 'lecture', 'study_session']),
  template_data: z.record(z.any()),
  is_public: z.boolean().default(false),
});

const ApplyTemplateSchema = z.object({
  template_id: z.string().uuid(),
  course_id: z.string().uuid(),
  customizations: z.record(z.any()).optional(),
});

// Study Materials service class
class StudyMaterialsService {
  constructor(private supabaseClient: any, private user: any) {}

  async createTemplate(data: any) {
    const { template_name, task_type, template_data, is_public } = CreateTemplateSchema.parse(data);

    const { data: template, error } = await this.supabaseClient
      .from('study_templates')
      .insert({
        user_id: this.user.id,
        template_name,
        task_type,
        template_data,
        is_public,
      })
      .select()
      .single();

    if (error) {
      throw new AppError(error.message, 500, 'DB_INSERT_ERROR');
    }

    return template;
  }

  async getTemplates() {
    const { data: templates, error } = await this.supabaseClient
      .from('study_templates')
      .select('*')
      .or(`user_id.eq.${this.user.id},is_public.eq.true`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(error.message, 500, 'DB_QUERY_ERROR');
    }

    return templates;
  }

  async updateTemplate(templateId: string, data: any) {
    // Verify ownership
    const { data: existingTemplate, error: checkError } = await this.supabaseClient
      .from('study_templates')
      .select('id')
      .eq('id', templateId)
      .eq('user_id', this.user.id)
      .single();

    if (checkError || !existingTemplate) {
      throw new AppError('Template not found or access denied', 404, 'NOT_FOUND');
    }

    const { data: template, error } = await this.supabaseClient
      .from('study_templates')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      throw new AppError(error.message, 500, 'DB_UPDATE_ERROR');
    }

    return template;
  }

  async deleteTemplate(templateId: string) {
    // Verify ownership
    const { data: existingTemplate, error: checkError } = await this.supabaseClient
      .from('study_templates')
      .select('id')
      .eq('id', templateId)
      .eq('user_id', this.user.id)
      .single();

    if (checkError || !existingTemplate) {
      throw new AppError('Template not found or access denied', 404, 'NOT_FOUND');
    }

    const { error } = await this.supabaseClient
      .from('study_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      throw new AppError(error.message, 500, 'DB_DELETE_ERROR');
    }

    return { success: true, message: 'Template deleted successfully' };
  }

  async applyTemplate(data: any) {
    const { template_id, course_id, customizations } = ApplyTemplateSchema.parse(data);

    // Get template
    const { data: template, error: templateError } = await this.supabaseClient
      .from('study_templates')
      .select('*')
      .eq('id', template_id)
      .or(`user_id.eq.${this.user.id},is_public.eq.true`)
      .single();

    if (templateError || !template) {
      throw new AppError('Template not found or access denied', 404, 'NOT_FOUND');
    }

    // Verify course ownership
    const { data: course, error: courseError } = await this.supabaseClient
      .from('courses')
      .select('id')
      .eq('id', course_id)
      .eq('user_id', this.user.id)
      .single();

    if (courseError || !course) {
      throw new AppError('Course not found or access denied', 404, 'NOT_FOUND');
    }

    // Apply template data with customizations
    const templateData = { ...template.template_data, ...customizations };
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) throw new AppError('Encryption key not configured', 500, 'CONFIG_ERROR');

    let createdItem;
    const { encrypt } = await import('../_shared/encryption.ts');

    switch (template.task_type) {
      case 'assignment':
        const encryptedTitle = await encrypt(templateData.title, encryptionKey);
        const encryptedDescription = templateData.description 
          ? await encrypt(templateData.description, encryptionKey) 
          : null;

        const { data: assignment, error: assignmentError } = await this.supabaseClient
          .from('assignments')
          .insert({
            user_id: this.user.id,
            course_id,
            title: encryptedTitle,
            description: encryptedDescription,
            due_date: templateData.due_date,
            submission_method: templateData.submission_method,
            submission_link: templateData.submission_link,
          })
          .select()
          .single();

        if (assignmentError) {
          throw new AppError(assignmentError.message, 500, 'DB_INSERT_ERROR');
        }
        createdItem = assignment;
        break;

      case 'lecture':
        const encryptedLectureName = await encrypt(templateData.lecture_name, encryptionKey);
        const encryptedLectureDescription = templateData.description 
          ? await encrypt(templateData.description, encryptionKey) 
          : null;

        const { data: lecture, error: lectureError } = await this.supabaseClient
          .from('lectures')
          .insert({
            user_id: this.user.id,
            course_id,
            lecture_name: encryptedLectureName,
            description: encryptedLectureDescription,
            start_time: templateData.start_time,
            end_time: templateData.end_time,
            is_recurring: templateData.is_recurring || false,
            recurring_pattern: templateData.recurring_pattern,
          })
          .select()
          .single();

        if (lectureError) {
          throw new AppError(lectureError.message, 500, 'DB_INSERT_ERROR');
        }
        createdItem = lecture;
        break;

      case 'study_session':
        const encryptedTopic = await encrypt(templateData.topic, encryptionKey);
        const encryptedNotes = templateData.notes 
          ? await encrypt(templateData.notes, encryptionKey) 
          : null;

        const { data: studySession, error: sessionError } = await this.supabaseClient
          .from('study_sessions')
          .insert({
            user_id: this.user.id,
            course_id,
            topic: encryptedTopic,
            notes: encryptedNotes,
            session_date: templateData.session_date,
            has_spaced_repetition: templateData.has_spaced_repetition || false,
          })
          .select()
          .single();

        if (sessionError) {
          throw new AppError(sessionError.message, 500, 'DB_INSERT_ERROR');
        }
        createdItem = studySession;
        break;

      default:
        throw new AppError('Invalid template type', 400, 'INVALID_INPUT');
    }

    return {
      success: true,
      created_item: createdItem,
      template_used: template.template_name,
    };
  }

  async getStudyMaterials() {
    // Get user's study materials (notes, documents, etc.)
    const { data: materials, error } = await this.supabaseClient
      .from('study_materials')
      .select(`
        *,
        courses (
          id,
          course_name,
          course_code
        )
      `)
      .eq('user_id', this.user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(error.message, 500, 'DB_QUERY_ERROR');
    }

    return materials;
  }

  async shareMaterials(data: any) {
    const { material_id, share_with_users, share_level } = data;

    // Verify ownership
    const { data: material, error: checkError } = await this.supabaseClient
      .from('study_materials')
      .select('id')
      .eq('id', material_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError || !material) {
      throw new AppError('Material not found or access denied', 404, 'NOT_FOUND');
    }

    // Create sharing records
    const sharingRecords = share_with_users.map((userId: string) => ({
      material_id,
      shared_by: this.user.id,
      shared_with: userId,
      share_level: share_level || 'read',
      created_at: new Date().toISOString(),
    }));

    const { data: shares, error: shareError } = await this.supabaseClient
      .from('material_shares')
      .insert(sharingRecords)
      .select();

    if (shareError) {
      throw new AppError(shareError.message, 500, 'DB_INSERT_ERROR');
    }

    return {
      success: true,
      shared_count: shares.length,
      message: 'Materials shared successfully',
    };
  }
}

// Main handler
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1]; // Get the last part as action

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return createResponse({ error: 'Unauthorized' }, 401);
    }

    // Create study materials service
    const materialsService = new StudyMaterialsService(supabaseClient, user);

    // Route to appropriate handler
    switch (action) {
      case 'create-template':
        const templateData = await req.json();
        const template = await materialsService.createTemplate(templateData);
        return createResponse({ data: template }, 201);

      case 'templates':
        const templates = await materialsService.getTemplates();
        return createResponse({ data: templates }, 200);

      case 'template':
        const templateId = pathParts[pathParts.length - 2]; // Get ID from path
        if (req.method === 'PUT') {
          const updateData = await req.json();
          const updatedTemplate = await materialsService.updateTemplate(templateId, updateData);
          return createResponse({ data: updatedTemplate }, 200);
        } else if (req.method === 'DELETE') {
          const deleteResult = await materialsService.deleteTemplate(templateId);
          return createResponse({ data: deleteResult }, 200);
        }
        break;

      case 'apply-template':
        const applyData = await req.json();
        const appliedTemplate = await materialsService.applyTemplate(applyData);
        return createResponse({ data: appliedTemplate }, 200);

      case 'materials':
        const materials = await materialsService.getStudyMaterials();
        return createResponse({ data: materials }, 200);

      case 'share':
        const shareData = await req.json();
        const shareResult = await materialsService.shareMaterials(shareData);
        return createResponse({ data: shareResult }, 200);

      default:
        return createResponse({ error: 'Invalid action' }, 404);
    }

  } catch (error) {
    console.error('Study materials error:', error);
    return createResponse({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, 500);
  }
});
