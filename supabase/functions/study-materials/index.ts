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
import { AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { wrapOldHandler, extractIdFromUrl } from '../api-v2/_handler-utils.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createResponse, errorResponse } from '../_shared/response.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import {
  CreateTemplateSchema,
  UpdateTemplateSchema,
  DeleteTemplateSchema,
  ApplyTemplateSchema,
  ShareMaterialsSchema,
} from '../_shared/schemas/studyMaterials.ts';

// Study Materials service class
class StudyMaterialsService {
  constructor(
    private supabaseClient: any,
    private user: any,
  ) {}

  async createTemplate(data: any) {
    const { template_name, task_type, template_data, is_public } =
      CreateTemplateSchema.parse(data);

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
      throw handleDbError(error);
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
      throw handleDbError(error);
    }

    return templates;
  }

  async updateTemplate(templateId: string, data: any) {
    // Verify ownership
    const { data: existingTemplate, error: checkError } =
      await this.supabaseClient
        .from('study_templates')
        .select('id')
        .eq('id', templateId)
        .eq('user_id', this.user.id)
        .single();

    if (checkError || !existingTemplate) {
      throw new AppError(
        'Template not found or access denied',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
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
      throw handleDbError(error);
    }

    return template;
  }

  async deleteTemplate(templateId: string) {
    // Verify ownership
    const { data: existingTemplate, error: checkError } =
      await this.supabaseClient
        .from('study_templates')
        .select('id')
        .eq('id', templateId)
        .eq('user_id', this.user.id)
        .single();

    if (checkError || !existingTemplate) {
      throw new AppError(
        'Template not found or access denied',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    const { error } = await this.supabaseClient
      .from('study_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      throw handleDbError(error);
    }

    return { success: true, message: 'Template deleted successfully' };
  }

  async applyTemplate(data: any) {
    const { template_id, course_id, customizations } =
      ApplyTemplateSchema.parse(data);

    // Get template
    const { data: template, error: templateError } = await this.supabaseClient
      .from('study_templates')
      .select('*')
      .eq('id', template_id)
      .or(`user_id.eq.${this.user.id},is_public.eq.true`)
      .single();

    if (templateError || !template) {
      throw new AppError(
        'Template not found or access denied',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    // Verify course ownership
    const { data: course, error: courseError } = await this.supabaseClient
      .from('courses')
      .select('id')
      .eq('id', course_id)
      .eq('user_id', this.user.id)
      .single();

    if (courseError || !course) {
      throw new AppError(
        'Course not found or access denied',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    // Apply template data with customizations
    const templateData = { ...template.template_data, ...customizations };
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey)
      throw new AppError(
        'Encryption key not configured',
        500,
        ERROR_CODES.CONFIG_ERROR,
      );

    let createdItem;
    const { encrypt } = await import('../_shared/encryption.ts');

    switch (template.task_type) {
      case 'assignment':
        const encryptedTitle = await encrypt(templateData.title, encryptionKey);
        const encryptedDescription = templateData.description
          ? await encrypt(templateData.description, encryptionKey)
          : null;

        const { data: assignment, error: assignmentError } =
          await this.supabaseClient
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
          throw handleDbError(assignmentError);
        }
        createdItem = assignment;
        break;

      case 'lecture':
        const encryptedLectureName = await encrypt(
          templateData.lecture_name,
          encryptionKey,
        );
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
          throw handleDbError(lectureError);
        }
        createdItem = lecture;
        break;

      case 'study_session':
        const encryptedTopic = await encrypt(templateData.topic, encryptionKey);
        const encryptedNotes = templateData.notes
          ? await encrypt(templateData.notes, encryptionKey)
          : null;

        const { data: studySession, error: sessionError } =
          await this.supabaseClient
            .from('study_sessions')
            .insert({
              user_id: this.user.id,
              course_id,
              topic: encryptedTopic,
              notes: encryptedNotes,
              session_date: templateData.session_date,
              has_spaced_repetition:
                templateData.has_spaced_repetition || false,
            })
            .select()
            .single();

        if (sessionError) {
          throw handleDbError(sessionError);
        }
        createdItem = studySession;
        break;

      default:
        throw new AppError(
          'Invalid template type',
          400,
          ERROR_CODES.INVALID_INPUT,
        );
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
      .select(
        `
        *,
        courses (
          id,
          course_name,
          course_code
        )
      `,
      )
      .eq('user_id', this.user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw handleDbError(error);
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
      throw new AppError(
        'Material not found or access denied',
        404,
        'NOT_FOUND',
      );
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
      throw handleDbError(shareError);
    }

    return {
      success: true,
      shared_count: shares.length,
      message: 'Materials shared successfully',
    };
  }
}

// Handler functions - Use AuthenticatedRequest and StudyMaterialsService
async function handleCreateTemplate(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new StudyMaterialsService(supabaseClient, user);
  return await service.createTemplate(body);
}

async function handleListTemplates(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new StudyMaterialsService(supabaseClient, user);
  return await service.getTemplates();
}

async function handleUpdateTemplate(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const templateId = body?.template_id || extractIdFromUrl(req.url);
  if (!templateId) {
    throw new AppError(
      'Template ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }
  const service = new StudyMaterialsService(supabaseClient, user);
  return await service.updateTemplate(templateId, body);
}

async function handleDeleteTemplate(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const templateId = body?.template_id || extractIdFromUrl(req.url);
  if (!templateId) {
    throw new AppError(
      'Template ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }
  const service = new StudyMaterialsService(supabaseClient, user);
  return await service.deleteTemplate(templateId);
}

async function handleApplyTemplate(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new StudyMaterialsService(supabaseClient, user);
  return await service.applyTemplate(body);
}

async function handleGetStudyMaterials(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new StudyMaterialsService(supabaseClient, user);
  return await service.getStudyMaterials();
}

async function handleShareMaterials(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new StudyMaterialsService(supabaseClient, user);
  return await service.shareMaterials(body);
}

// Route handlers - All handlers are wrapped with createAuthenticatedHandler
function getHandler(
  action: string | null,
  method: string,
  pathParts: string[],
) {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Handle ID-based routes (template/:id)
  if (action && uuidPattern.test(action) && pathParts.length > 1) {
    const secondToLast = pathParts[pathParts.length - 2];
    if (secondToLast === 'template') {
      if (method === 'PUT')
        return wrapOldHandler(
          handleUpdateTemplate,
          'materials-update-template',
          UpdateTemplateSchema,
          true,
        );
      if (method === 'DELETE')
        return wrapOldHandler(
          handleDeleteTemplate,
          'materials-delete-template',
          DeleteTemplateSchema,
          true,
        );
    }
  }

  const handlers: Record<string, Function> = {
    'create-template': wrapOldHandler(
      handleCreateTemplate,
      'materials-create-template',
      CreateTemplateSchema,
      true,
    ),
    templates: wrapOldHandler(
      handleListTemplates,
      'materials-templates',
      undefined,
      false,
    ),
    'apply-template': wrapOldHandler(
      handleApplyTemplate,
      'materials-apply-template',
      ApplyTemplateSchema,
      true,
    ),
    materials: wrapOldHandler(
      handleGetStudyMaterials,
      'materials-list',
      undefined,
      false,
    ),
    share: wrapOldHandler(
      handleShareMaterials,
      'materials-share',
      ShareMaterialsSchema,
      true,
    ),
  };

  return action ? handlers[action] : undefined;
}

// Main handler with routing
serve(async req => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    // Route to appropriate handler
    const handler = getHandler(action, req.method, pathParts);
    if (!handler) {
      return errorResponse(
        new AppError('Invalid action', 404, ERROR_CODES.DB_NOT_FOUND),
      );
    }

    // Handler is already wrapped with createAuthenticatedHandler, just call it
    return await handler(req);
  } catch (error) {
    const traceContext = extractTraceContext(req);
    await logger.error(
      'Study materials error',
      {
        error: error instanceof Error ? error.message : String(error),
        url: req.url,
      },
      traceContext,
    );
    return errorResponse(
      error instanceof AppError
        ? error
        : new AppError(
            'Internal server error',
            500,
            ERROR_CODES.INTERNAL_ERROR,
          ),
      500,
    );
  }
});
