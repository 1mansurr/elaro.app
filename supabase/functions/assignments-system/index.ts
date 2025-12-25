/**
 * Consolidated Assignments System Edge Function
 *
 * This function consolidates all assignment-related operations that were previously
 * spread across multiple separate Edge Functions.
 *
 * Routes:
 * - POST /assignments-system/create - Create assignment
 * - PUT /assignments-system/update - Update assignment
 * - DELETE /assignments-system/delete - Soft delete assignment
 * - POST /assignments-system/restore - Restore deleted assignment
 * - DELETE /assignments-system/delete-permanently - Permanently delete assignment
 * - GET /assignments-system/list - List user assignments
 * - GET /assignments-system/get/:id - Get specific assignment
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  AuthenticatedRequest,
  AppError,
  ERROR_CODES,
} from '../_shared/function-handler.ts';
import { wrapOldHandler, extractIdFromUrl } from '../api-v2/_handler-utils.ts';
import {
  CreateAssignmentSchema,
  UpdateAssignmentSchema,
  DeleteAssignmentSchema,
  RestoreAssignmentSchema,
} from '../_shared/schemas/assignment.ts';
import { encrypt, decrypt } from '../_shared/encryption.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/response.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import {
  type SupabaseClient,
  type User,
} from 'https://esm.sh/@supabase/supabase-js@2.0.0';

// Assignment service class
class AssignmentService {
  constructor(
    private supabaseClient: SupabaseClient,
    private user: User,
  ) {}

  async createAssignment(data: Record<string, unknown>) {
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey)
      throw new AppError(
        'Encryption key not configured.',
        500,
        ERROR_CODES.CONFIG_ERROR,
      );

    const {
      course_id,
      title,
      description,
      due_date,
      submission_method,
      submission_link,
      reminders,
    } = data;

    // 1. SECURITY: Verify course ownership
    const { data: course, error: courseError } = await this.supabaseClient
      .from('courses')
      .select('id')
      .eq('id', course_id)
      .eq('user_id', this.user.id)
      .single();

    if (courseError || !course) {
      throw new AppError(
        'Course not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    // 2. Core Business Logic
    const encryptedTitle = await encrypt(title, encryptionKey);
    const encryptedDescription = description
      ? await encrypt(description, encryptionKey)
      : null;

    const { data: newAssignment, error: insertError } =
      await this.supabaseClient
        .from('assignments')
        .insert({
          user_id: this.user.id,
          course_id,
          title: encryptedTitle,
          description: encryptedDescription,
          due_date,
          submission_method,
          submission_link,
        })
        .select()
        .single();

    if (insertError) {
      throw new AppError(insertError.message, 500, ERROR_CODES.DB_INSERT_ERROR);
    }

    // 3. Reminder creation logic
    if (newAssignment && reminders && reminders.length > 0) {
      const dueDate = new Date(due_date);
      const remindersToInsert = reminders.map((mins: number) => ({
        user_id: this.user.id,
        assignment_id: newAssignment.id,
        reminder_time: new Date(dueDate.getTime() - mins * 60000).toISOString(),
        reminder_type: 'assignment',
        day_number: Math.ceil(mins / (24 * 60)),
        completed: false,
      }));

      const { error: reminderError } = await this.supabaseClient
        .from('reminders')
        .insert(remindersToInsert);
      if (reminderError) {
        // Non-critical error, so we don't throw. The assignment was still created.
        // Log for monitoring but don't fail the request
      }
    }

    return newAssignment;
  }

  async updateAssignment(data: Record<string, unknown>) {
    const { assignment_id, ...updates } = data;
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey)
      throw new AppError(
        'Encryption key not configured.',
        500,
        ERROR_CODES.CONFIG_ERROR,
      );

    // SECURITY: Verify ownership before updating
    const { error: checkError } = await this.supabaseClient
      .from('assignments')
      .select('id')
      .eq('id', assignment_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError)
      throw new AppError(
        'Assignment not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );

    // Encrypt fields if they are being updated
    const encryptedUpdates = { ...updates };
    if (updates.title) {
      encryptedUpdates.title = await encrypt(updates.title, encryptionKey);
    }
    if (updates.description) {
      encryptedUpdates.description = await encrypt(
        updates.description,
        encryptionKey,
      );
    }

    const { data: updatedData, error: updateError } = await this.supabaseClient
      .from('assignments')
      .update({
        ...encryptedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignment_id)
      .select()
      .single();

    if (updateError)
      throw new AppError(updateError.message, 500, ERROR_CODES.DB_UPDATE_ERROR);

    return updatedData;
  }

  async deleteAssignment(data: Record<string, unknown>) {
    const { assignment_id } = data;

    // SECURITY: Verify ownership before deleting
    const { error: checkError } = await this.supabaseClient
      .from('assignments')
      .select('id')
      .eq('id', assignment_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError)
      throw new AppError(
        'Assignment not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );

    // Perform soft delete
    const { error: deleteError } = await this.supabaseClient
      .from('assignments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', assignment_id);

    if (deleteError)
      throw new AppError(deleteError.message, 500, ERROR_CODES.DB_DELETE_ERROR);

    return { success: true, message: 'Assignment deleted successfully.' };
  }

  async restoreAssignment(data: Record<string, unknown>) {
    const { assignment_id } = data;

    // SECURITY: Verify ownership before restoring
    const { error: checkError } = await this.supabaseClient
      .from('assignments')
      .select('id')
      .eq('id', assignment_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError)
      throw new AppError(
        'Assignment not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );

    // Restore by setting deleted_at to null
    const { error: restoreError } = await this.supabaseClient
      .from('assignments')
      .update({ deleted_at: null })
      .eq('id', assignment_id);

    if (restoreError)
      throw new AppError(
        restoreError.message,
        500,
        ERROR_CODES.DB_UPDATE_ERROR,
      );

    return { success: true, message: 'Assignment restored successfully.' };
  }

  async deletePermanently(data: Record<string, unknown>) {
    const { assignment_id } = data;

    // SECURITY: Verify ownership before permanently deleting
    const { error: checkError } = await this.supabaseClient
      .from('assignments')
      .select('id')
      .eq('id', assignment_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError)
      throw new AppError(
        'Assignment not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );

    // Permanently delete
    const { error: deleteError } = await this.supabaseClient
      .from('assignments')
      .delete()
      .eq('id', assignment_id);

    if (deleteError)
      throw new AppError(deleteError.message, 500, ERROR_CODES.DB_DELETE_ERROR);

    return { success: true, message: 'Assignment permanently deleted.' };
  }

  async listAssignments() {
    const { data: assignments, error } = await this.supabaseClient
      .from('assignments')
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

    if (error)
      throw new AppError(error.message, 500, ERROR_CODES.DB_QUERY_ERROR);

    // Decrypt sensitive data
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (encryptionKey) {
      for (const assignment of assignments) {
        if (assignment.title) {
          assignment.title = await decrypt(assignment.title, encryptionKey);
        }
        if (assignment.description) {
          assignment.description = await decrypt(
            assignment.description,
            encryptionKey,
          );
        }
      }
    }

    return assignments;
  }

  async getAssignment(assignmentId: string) {
    const { data: assignment, error } = await this.supabaseClient
      .from('assignments')
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
      .eq('id', assignmentId)
      .eq('user_id', this.user.id)
      .single();

    if (error || !assignment) {
      throw new AppError(
        'Assignment not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    // Decrypt sensitive data
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (encryptionKey) {
      if (assignment.title) {
        assignment.title = await decrypt(assignment.title, encryptionKey);
      }
      if (assignment.description) {
        assignment.description = await decrypt(
          assignment.description,
          encryptionKey,
        );
      }
    }

    return assignment;
  }
}

// Handler functions - Use AuthenticatedRequest and AssignmentService
async function handleCreateAssignment(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new AssignmentService(supabaseClient, user);
  return await service.createAssignment(body);
}

async function handleUpdateAssignment(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new AssignmentService(supabaseClient, user);
  return await service.updateAssignment(body);
}

async function handleDeleteAssignment(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new AssignmentService(supabaseClient, user);
  return await service.deleteAssignment(body);
}

async function handleRestoreAssignment(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new AssignmentService(supabaseClient, user);
  return await service.restoreAssignment(body);
}

async function handleDeletePermanently(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new AssignmentService(supabaseClient, user);
  return await service.deletePermanently(body);
}

async function handleListAssignments(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new AssignmentService(supabaseClient, user);
  return await service.listAssignments();
}

async function handleGetAssignment(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  // ID can be in body or URL path
  const assignmentId = body?.assignment_id || extractIdFromUrl(req.url);
  if (!assignmentId) {
    throw new AppError(
      'Assignment ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }
  const service = new AssignmentService(supabaseClient, user);
  return await service.getAssignment(assignmentId);
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
    // Get action - if last part is a UUID and second-to-last is 'get', use 'get' as action
    let action = pathParts[pathParts.length - 1];
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      uuidPattern.test(action) &&
      pathParts.length > 1 &&
      pathParts[pathParts.length - 2] === 'get'
    ) {
      action = 'get';
    }

    // Route to appropriate handler
    const handler = getHandler(action);
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
      'Assignments system error',
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

// Route handlers - All handlers are wrapped with createAuthenticatedHandler
type HandlerFunction = (req: Request) => Promise<Response>;

function getHandler(action: string | null) {
  const handlers: Record<string, HandlerFunction> = {
    create: wrapOldHandler(
      handleCreateAssignment,
      'assignments-create',
      CreateAssignmentSchema,
      true,
    ),
    update: wrapOldHandler(
      handleUpdateAssignment,
      'assignments-update',
      UpdateAssignmentSchema,
      true,
    ),
    delete: wrapOldHandler(
      handleDeleteAssignment,
      'assignments-delete',
      DeleteAssignmentSchema,
      true,
    ),
    restore: wrapOldHandler(
      handleRestoreAssignment,
      'assignments-restore',
      RestoreAssignmentSchema,
      true,
    ),
    'delete-permanently': wrapOldHandler(
      handleDeletePermanently,
      'assignments-delete-permanently',
      DeleteAssignmentSchema,
      true,
    ),
    list: wrapOldHandler(
      handleListAssignments,
      'assignments-list',
      undefined,
      false,
    ),
    get: wrapOldHandler(
      handleGetAssignment,
      'assignments-get',
      undefined,
      false,
    ),
  };

  return action ? handlers[action] : undefined;
}
