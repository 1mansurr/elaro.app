// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { wrapOldHandler } from '../api-v2/_handler-utils.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/response.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import {
  CreateTemplateSchema,
  UpdateTemplateSchema,
  DeleteTemplateSchema,
} from '../_shared/schemas/template.ts';
import {
  type SupabaseClient,
  type User,
  // @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
} from 'https://esm.sh/@supabase/supabase-js@2.0.0';

// Template service class
class TemplateService {
  constructor(
    private supabaseClient: SupabaseClient,
    private user: User,
  ) {}

  async getTemplates() {
    const { data: templates, error } = await this.supabaseClient
      .from('task_templates')
      .select('*')
      .eq('user_id', this.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw handleDbError(error);
    }

    return { templates: templates || [] };
  }

  async createTemplate(data: Record<string, unknown>) {
    // PASS 1: Use safeParse to prevent ZodError from crashing worker
    const validationResult = CreateTemplateSchema.safeParse(data);
    if (!validationResult.success) {
      const zodError = validationResult.error;
      const flattened = zodError.flatten();
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
        message: 'Request body validation failed',
        errors: flattened.fieldErrors,
        formErrors: flattened.formErrors,
      });
    }
    const { template_name, task_type, template_data } = validationResult.data;

    const { data: template, error } = await this.supabaseClient
      .from('task_templates')
      .insert({
        user_id: this.user.id,
        template_name,
        task_type,
        template_data,
      })
      .select()
      .single();

    if (error) {
      throw handleDbError(error);
    }

    return { template };
  }

  async updateTemplate(data: Record<string, unknown>) {
    // PASS 1: Use safeParse to prevent ZodError from crashing worker
    const validationResult = UpdateTemplateSchema.safeParse(data);
    if (!validationResult.success) {
      const zodError = validationResult.error;
      const flattened = zodError.flatten();
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
        message: 'Request body validation failed',
        errors: flattened.fieldErrors,
        formErrors: flattened.formErrors,
      });
    }
    const { id, ...updates } = validationResult.data;

    // Verify ownership before updating
    const { data: existing, error: checkError } = await this.supabaseClient
      .from('task_templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError || !existing) {
      throw new AppError(
        'Template not found or access denied',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    const { data: template, error } = await this.supabaseClient
      .from('task_templates')
      .update(updates)
      .eq('id', id)
      .eq('user_id', this.user.id)
      .select()
      .single();

    if (error) {
      throw handleDbError(error);
    }

    return { template };
  }

  async deleteTemplate(templateId: string) {
    // Verify ownership before deleting
    const { data: existing, error: checkError } = await this.supabaseClient
      .from('task_templates')
      .select('id')
      .eq('id', templateId)
      .eq('user_id', this.user.id)
      .single();

    if (checkError || !existing) {
      throw new AppError(
        'Template not found or access denied',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    const { error } = await this.supabaseClient
      .from('task_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', this.user.id);

    if (error) {
      throw handleDbError(error);
    }

    return { success: true };
  }
}

// Handler functions - Use AuthenticatedRequest and TemplateService
async function handleGetTemplates(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new TemplateService(supabaseClient, user);
  return await service.getTemplates();
}

async function handleCreateTemplate(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new TemplateService(supabaseClient, user);
  return await service.createTemplate(body);
}

async function handleUpdateTemplate(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new TemplateService(supabaseClient, user);
  return await service.updateTemplate(body);
}

async function handleDeleteTemplate(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const url = new URL(req.url);
  const templateId = url.searchParams.get('id');

  if (!templateId) {
    throw new AppError(
      'Template ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const service = new TemplateService(supabaseClient, user);
  return await service.deleteTemplate(templateId);
}

// Route handlers - All handlers are wrapped with createAuthenticatedHandler
type HandlerFunction = (req: Request) => Promise<Response>;

function getHandler(method: string) {
  const handlers: Record<string, HandlerFunction> = {
    GET: wrapOldHandler(handleGetTemplates, 'template-list', undefined, false),
    POST: wrapOldHandler(
      handleCreateTemplate,
      'template-create',
      CreateTemplateSchema,
      true,
    ),
    PUT: wrapOldHandler(
      handleUpdateTemplate,
      'template-update',
      UpdateTemplateSchema,
      true,
    ),
    DELETE: wrapOldHandler(
      handleDeleteTemplate,
      'template-delete',
      DeleteTemplateSchema,
      true,
    ),
  };

  return handlers[method];
}

// Main handler with routing
serve(async (req: Request) => {
  const origin = req.headers.get('Origin');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  try {
    const method = req.method;
    const handler = getHandler(method);

    if (!handler) {
      return errorResponse(
        new AppError('Method not allowed', 405, ERROR_CODES.INTERNAL_ERROR),
        405,
      );
    }

    // Handler is already wrapped with createAuthenticatedHandler, just call it
    return await handler(req);
  } catch (error) {
    const traceContext = extractTraceContext(req);
    await logger.error(
      'Template actions error',
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
