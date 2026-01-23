/**
 * Consolidated Study Sessions System Edge Function
 *
 * This function consolidates all study session-related operations that were previously
 * spread across multiple separate Edge Functions.
 *
 * Routes:
 * - POST /study-sessions-system/create - Create study session
 * - PUT /study-sessions-system/update - Update study session
 * - DELETE /study-sessions-system/delete - Soft delete study session
 * - POST /study-sessions-system/restore - Restore deleted study session
 * - DELETE /study-sessions-system/delete-permanently - Permanently delete study session
 * - GET /study-sessions-system/list - List user study sessions
 * - GET /study-sessions-system/get/:id - Get specific study session
 */

// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  AuthenticatedRequest,
  AppError,
} from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { wrapOldHandler, extractIdFromUrl } from '../api-v2/_handler-utils.ts';
import {
  CreateStudySessionSchema,
  UpdateStudySessionSchema,
  DeleteStudySessionSchema,
  RestoreStudySessionSchema,
} from '../_shared/schemas/studySession.ts';
import { encrypt, decrypt } from '../_shared/encryption.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/response.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import {
  type SupabaseClient,
  type User,
  // @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
} from 'https://esm.sh/@supabase/supabase-js@2.0.0';

// Study Session service class
class StudySessionService {
  constructor(
    private supabaseClient: SupabaseClient,
    private user: User,
  ) {}

  async createStudySession(data: Record<string, unknown>) {
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey)
      throw new AppError(
        'Encryption key not configured.',
        500,
        ERROR_CODES.CONFIG_ERROR,
      );

    const {
      course_id,
      topic,
      notes,
      session_date,
      has_spaced_repetition,
      reminders,
    } = data;

    // Type guards
    if (typeof course_id !== 'string') {
      throw new AppError('course_id must be a string', 400, ERROR_CODES.VALIDATION_ERROR);
    }
    if (typeof topic !== 'string') {
      throw new AppError('topic must be a string', 400, ERROR_CODES.VALIDATION_ERROR);
    }
    if (typeof session_date !== 'string') {
      throw new AppError('session_date must be a string', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // SECURITY: Verify course ownership
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

    const [encryptedTopic, encryptedNotes] = await Promise.all([
      encrypt(topic, encryptionKey),
      notes && typeof notes === 'string' ? encrypt(notes, encryptionKey) : null,
    ]);

    const { data: newSession, error: insertError } = await this.supabaseClient
      .from('study_sessions')
      .insert({
        user_id: this.user.id,
        course_id,
        topic: encryptedTopic,
        notes: encryptedNotes,
        session_date,
        has_spaced_repetition,
      })
      .select('id, topic, session_date')
      .single();

    if (insertError) {
      throw new AppError(insertError.message, 500, ERROR_CODES.DB_INSERT_ERROR);
    }

    // Create reminders if provided
    if (newSession && reminders && Array.isArray(reminders) && reminders.length > 0) {
      const sessionDate = new Date(session_date);
      const remindersToInsert = (reminders as number[]).map((mins: number) => ({
        user_id: this.user.id,
        study_session_id: newSession.id,
        reminder_time: new Date(
          sessionDate.getTime() - mins * 60000,
        ).toISOString(),
        reminder_type: 'study_session',
        day_number: Math.ceil(mins / (24 * 60)),
        completed: false,
      }));

      const { error: reminderError } = await this.supabaseClient
        .from('reminders')
        .insert(remindersToInsert);
      if (reminderError) {
        // Non-critical error, so we don't throw. The study session was still created.
        // Log for monitoring but don't fail the request
      }
    }

    return newSession;
  }

  async updateStudySession(data: Record<string, unknown>) {
    const { study_session_id, ...updates } = data;
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey)
      throw new AppError(
        'Encryption key not configured.',
        500,
        ERROR_CODES.CONFIG_ERROR,
      );

    // SECURITY: Verify ownership before updating
    const { error: checkError } = await this.supabaseClient
      .from('study_sessions')
      .select('id')
      .eq('id', study_session_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError)
      throw new AppError(
        'Study session not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );

    // Encrypt fields if they are being updated
    const encryptedUpdates = { ...updates };
    if (updates.topic && typeof updates.topic === 'string') {
      encryptedUpdates.topic = await encrypt(updates.topic, encryptionKey);
    }
    if (updates.notes && typeof updates.notes === 'string') {
      encryptedUpdates.notes = await encrypt(updates.notes, encryptionKey);
    }

    const { data: updatedData, error: updateError } = await this.supabaseClient
      .from('study_sessions')
      .update({
        ...encryptedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', study_session_id)
      .select()
      .single();

    if (updateError)
      throw new AppError(updateError.message, 500, ERROR_CODES.DB_UPDATE_ERROR);

    return updatedData;
  }

  async deleteStudySession(data: Record<string, unknown>) {
    const { study_session_id } = data;

    // SECURITY: Verify ownership before deleting
    const { error: checkError } = await this.supabaseClient
      .from('study_sessions')
      .select('id')
      .eq('id', study_session_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError)
      throw new AppError(
        'Study session not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );

    // Perform soft delete
    const { error: deleteError } = await this.supabaseClient
      .from('study_sessions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', study_session_id);

    if (deleteError)
      throw new AppError(deleteError.message, 500, ERROR_CODES.DB_DELETE_ERROR);

    return { success: true, message: 'Study session deleted successfully.' };
  }

  async restoreStudySession(data: Record<string, unknown>) {
    const { study_session_id } = data;

    // SECURITY: Verify ownership before restoring
    const { error: checkError } = await this.supabaseClient
      .from('study_sessions')
      .select('id')
      .eq('id', study_session_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError)
      throw new AppError(
        'Study session not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );

    // Restore by setting deleted_at to null
    const { error: restoreError } = await this.supabaseClient
      .from('study_sessions')
      .update({ deleted_at: null })
      .eq('id', study_session_id);

    if (restoreError)
      throw new AppError(
        restoreError.message,
        500,
        ERROR_CODES.DB_UPDATE_ERROR,
      );

    return { success: true, message: 'Study session restored successfully.' };
  }

  async deletePermanently(data: Record<string, unknown>) {
    const { study_session_id } = data;

    // SECURITY: Verify ownership before permanently deleting
    const { error: checkError } = await this.supabaseClient
      .from('study_sessions')
      .select('id')
      .eq('id', study_session_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError)
      throw new AppError(
        'Study session not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );

    // Permanently delete
    const { error: deleteError } = await this.supabaseClient
      .from('study_sessions')
      .delete()
      .eq('id', study_session_id);

    if (deleteError)
      throw new AppError(deleteError.message, 500, ERROR_CODES.DB_DELETE_ERROR);

    return { success: true, message: 'Study session permanently deleted.' };
  }

  async listStudySessions() {
    const { data: studySessions, error } = await this.supabaseClient
      .from('study_sessions')
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
      .order('session_date', { ascending: false });

    if (error)
      throw new AppError(error.message, 500, ERROR_CODES.DB_QUERY_ERROR);

    // Decrypt sensitive data
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (encryptionKey) {
      for (const session of studySessions) {
        if (session.topic) {
          session.topic = await decrypt(session.topic, encryptionKey);
        }
        if (session.notes) {
          session.notes = await decrypt(session.notes, encryptionKey);
        }
      }
    }

    return studySessions;
  }

  async getStudySession(studySessionId: string) {
    const { data: studySession, error } = await this.supabaseClient
      .from('study_sessions')
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
      .eq('id', studySessionId)
      .eq('user_id', this.user.id)
      .single();

    if (error || !studySession) {
      throw new AppError(
        'Study session not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    // Decrypt sensitive data
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (encryptionKey) {
      if (studySession.topic) {
        studySession.topic = await decrypt(studySession.topic, encryptionKey);
      }
      if (studySession.notes) {
        studySession.notes = await decrypt(studySession.notes, encryptionKey);
      }
    }

    return studySession;
  }
}

// Handler functions - Use AuthenticatedRequest and StudySessionService
async function handleCreateStudySession(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new StudySessionService(supabaseClient, user);
  return await service.createStudySession(body);
}

async function handleUpdateStudySession(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new StudySessionService(supabaseClient, user);
  return await service.updateStudySession(body);
}

async function handleDeleteStudySession(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new StudySessionService(supabaseClient, user);
  return await service.deleteStudySession(body);
}

async function handleRestoreStudySession(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new StudySessionService(supabaseClient, user);
  return await service.restoreStudySession(body);
}

async function handleDeletePermanently(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new StudySessionService(supabaseClient, user);
  return await service.deletePermanently(body);
}

async function handleListStudySessions(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new StudySessionService(supabaseClient, user);
  return await service.listStudySessions();
}

async function handleGetStudySession(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const bodySessionId = body && typeof body === 'object' && 'study_session_id' in body
    ? (typeof body.study_session_id === 'string' ? body.study_session_id : null)
    : null;
  const studySessionId = bodySessionId || extractIdFromUrl(req.url);
  if (!studySessionId || typeof studySessionId !== 'string') {
    throw new AppError(
      'Study session ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }
  const service = new StudySessionService(supabaseClient, user);
  return await service.getStudySession(studySessionId);
}

// Main handler with routing
serve(async (req: Request) => {
  const origin = req.headers.get('Origin');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
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
      'Study sessions system error',
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
      handleCreateStudySession,
      'study-sessions-create',
      CreateStudySessionSchema,
      true,
    ),
    update: wrapOldHandler(
      handleUpdateStudySession,
      'study-sessions-update',
      UpdateStudySessionSchema,
      true,
    ),
    delete: wrapOldHandler(
      handleDeleteStudySession,
      'study-sessions-delete',
      DeleteStudySessionSchema,
      true,
    ),
    restore: wrapOldHandler(
      handleRestoreStudySession,
      'study-sessions-restore',
      RestoreStudySessionSchema,
      true,
    ),
    'delete-permanently': wrapOldHandler(
      handleDeletePermanently,
      'study-sessions-delete-permanently',
      DeleteStudySessionSchema,
      true,
    ),
    list: wrapOldHandler(
      handleListStudySessions,
      'study-sessions-list',
      undefined,
      false,
    ),
    get: wrapOldHandler(
      handleGetStudySession,
      'study-sessions-get',
      undefined,
      false,
    ),
  };

  return action ? handlers[action] : undefined;
}
