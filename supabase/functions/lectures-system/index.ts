/**
 * Consolidated Lectures System Edge Function
 *
 * This function consolidates all lecture-related operations that were previously
 * spread across multiple separate Edge Functions.
 *
 * Routes:
 * - POST /lectures-system/create - Create lecture
 * - PUT /lectures-system/update - Update lecture
 * - DELETE /lectures-system/delete - Soft delete lecture
 * - POST /lectures-system/restore - Restore deleted lecture
 * - DELETE /lectures-system/delete-permanently - Permanently delete lecture
 * - GET /lectures-system/list - List user lectures
 * - GET /lectures-system/get/:id - Get specific lecture
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
  CreateLectureSchema,
  UpdateLectureSchema,
  DeleteLectureSchema,
  RestoreLectureSchema,
} from '../_shared/schemas/lecture.ts';
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

// Lecture service class
class LectureService {
  constructor(
    private supabaseClient: SupabaseClient,
    private user: User,
  ) {}

  async createLecture(data: Record<string, unknown>) {
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey)
      throw new AppError(
        'Encryption key not configured.',
        500,
        ERROR_CODES.CONFIG_ERROR,
      );

    const {
      course_id,
      lecture_name,
      start_time,
      end_time,
      description,
      is_recurring,
      recurring_pattern,
      reminders,
    } = data;

    // Type guards
    if (typeof lecture_name !== 'string' || typeof course_id !== 'string') {
      throw new AppError(
        'lecture_name and course_id are required',
        400,
        ERROR_CODES.INVALID_INPUT,
      );
    }

    // SECURITY: Verify the user owns the course they are adding a lecture to.
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

    const [encryptedLectureName, encryptedDescription] = await Promise.all([
      encrypt(lecture_name, encryptionKey),
      description && typeof description === 'string' ? encrypt(description, encryptionKey) : null,
    ]);

    const { data: newLecture, error: insertError } = await this.supabaseClient
      .from('lectures')
      .insert({
        user_id: this.user.id,
        course_id,
        lecture_name: encryptedLectureName,
        description: encryptedDescription,
        start_time,
        end_time: end_time || null,
        is_recurring: is_recurring || false,
        recurring_pattern: recurring_pattern || null,
      })
      .select()
      .single();

    if (insertError) {
      throw new AppError(insertError.message, 500, ERROR_CODES.DB_INSERT_ERROR);
    }

    // Create reminders if provided
    const remindersArray = Array.isArray(reminders) ? reminders.filter((r): r is number => typeof r === 'number') : [];
    if (newLecture && remindersArray.length > 0) {
      const startTimeTyped = typeof start_time === 'string' ? new Date(start_time) : new Date(start_time as string | number | Date);
      const remindersToInsert = remindersArray.map((mins: number) => ({
        user_id: this.user.id,
        lecture_id: newLecture.id,
        reminder_time: new Date(
          startTimeTyped.getTime() - mins * 60000,
        ).toISOString(),
        reminder_type: 'lecture',
        day_number: Math.ceil(mins / (24 * 60)),
        completed: false,
      }));

      const { error: reminderError } = await this.supabaseClient
        .from('reminders')
        .insert(remindersToInsert);
      if (reminderError) {
        // Non-critical error, so we don't throw. The lecture was still created.
        // Log for monitoring but don't fail the request
      }
    }

    return newLecture;
  }

  async updateLecture(data: Record<string, unknown>) {
    const { lecture_id, ...updates } = data;
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey)
      throw new AppError(
        'Encryption key not configured.',
        500,
        ERROR_CODES.CONFIG_ERROR,
      );

    // SECURITY: Verify ownership before updating
    const { error: checkError } = await this.supabaseClient
      .from('lectures')
      .select('id')
      .eq('id', lecture_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError)
      throw new AppError(
        'Lecture not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );

    // Encrypt fields if they are being updated
    const encryptedUpdates = { ...updates };
    if (updates.lecture_name && typeof updates.lecture_name === 'string') {
      encryptedUpdates.lecture_name = await encrypt(
        updates.lecture_name,
        encryptionKey,
      );
    }
    if (updates.description && typeof updates.description === 'string') {
      encryptedUpdates.description = await encrypt(
        updates.description,
        encryptionKey,
      );
    }

    const { data: updatedData, error: updateError } = await this.supabaseClient
      .from('lectures')
      .update({
        ...encryptedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lecture_id)
      .select()
      .single();

    if (updateError)
      throw new AppError(updateError.message, 500, ERROR_CODES.DB_UPDATE_ERROR);

    return updatedData;
  }

  async deleteLecture(data: Record<string, unknown>) {
    const { lecture_id } = data;

    // SECURITY: Verify ownership before deleting
    const { error: checkError } = await this.supabaseClient
      .from('lectures')
      .select('id')
      .eq('id', lecture_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError)
      throw new AppError(
        'Lecture not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );

    // Perform soft delete
    const { error: deleteError } = await this.supabaseClient
      .from('lectures')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', lecture_id);

    if (deleteError)
      throw new AppError(deleteError.message, 500, ERROR_CODES.DB_DELETE_ERROR);

    return { success: true, message: 'Lecture deleted successfully.' };
  }

  async restoreLecture(data: Record<string, unknown>) {
    const { lecture_id } = data;

    // SECURITY: Verify ownership before restoring
    const { error: checkError } = await this.supabaseClient
      .from('lectures')
      .select('id')
      .eq('id', lecture_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError)
      throw new AppError(
        'Lecture not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );

    // Restore by setting deleted_at to null
    const { error: restoreError } = await this.supabaseClient
      .from('lectures')
      .update({ deleted_at: null })
      .eq('id', lecture_id);

    if (restoreError)
      throw new AppError(
        restoreError.message,
        500,
        ERROR_CODES.DB_UPDATE_ERROR,
      );

    return { success: true, message: 'Lecture restored successfully.' };
  }

  async deletePermanently(data: Record<string, unknown>) {
    const { lecture_id } = data;

    // SECURITY: Verify ownership before permanently deleting
    const { error: checkError } = await this.supabaseClient
      .from('lectures')
      .select('id')
      .eq('id', lecture_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError)
      throw new AppError(
        'Lecture not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );

    // Permanently delete
    const { error: deleteError } = await this.supabaseClient
      .from('lectures')
      .delete()
      .eq('id', lecture_id);

    if (deleteError)
      throw new AppError(deleteError.message, 500, ERROR_CODES.DB_DELETE_ERROR);

    return { success: true, message: 'Lecture permanently deleted.' };
  }

  async listLectures() {
    const { data: lectures, error } = await this.supabaseClient
      .from('lectures')
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
      .order('start_time', { ascending: true });

    if (error)
      throw new AppError(error.message, 500, ERROR_CODES.DB_QUERY_ERROR);

    // Decrypt sensitive data
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (encryptionKey) {
      for (const lecture of lectures) {
        if (lecture.lecture_name) {
          lecture.lecture_name = await decrypt(
            lecture.lecture_name,
            encryptionKey,
          );
        }
        if (lecture.description) {
          lecture.description = await decrypt(
            lecture.description,
            encryptionKey,
          );
        }
      }
    }

    return lectures;
  }

  async getLecture(lectureId: string) {
    const { data: lecture, error } = await this.supabaseClient
      .from('lectures')
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
      .eq('id', lectureId)
      .eq('user_id', this.user.id)
      .single();

    if (error || !lecture) {
      throw new AppError(
        'Lecture not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    // Decrypt sensitive data
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (encryptionKey) {
      if (lecture.lecture_name) {
        lecture.lecture_name = await decrypt(
          lecture.lecture_name,
          encryptionKey,
        );
      }
      if (lecture.description) {
        lecture.description = await decrypt(lecture.description, encryptionKey);
      }
    }

    return lecture;
  }
}

// Handler functions - Use AuthenticatedRequest and LectureService
async function handleCreateLecture(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new LectureService(supabaseClient, user);
  return await service.createLecture(body);
}

async function handleUpdateLecture(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new LectureService(supabaseClient, user);
  return await service.updateLecture(body);
}

async function handleDeleteLecture(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new LectureService(supabaseClient, user);
  return await service.deleteLecture(body);
}

async function handleRestoreLecture(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new LectureService(supabaseClient, user);
  return await service.restoreLecture(body);
}

async function handleDeletePermanently(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new LectureService(supabaseClient, user);
  return await service.deletePermanently(body);
}

async function handleListLectures(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new LectureService(supabaseClient, user);
  return await service.listLectures();
}

async function handleGetLecture(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const lectureId = (body?.lecture_id as string) || extractIdFromUrl(req.url);
  if (!lectureId || typeof lectureId !== 'string') {
    throw new AppError(
      'Lecture ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }
  const service = new LectureService(supabaseClient, user);
  return await service.getLecture(lectureId);
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
      'Lectures system error',
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
      handleCreateLecture,
      'lectures-create',
      CreateLectureSchema,
      true,
    ),
    update: wrapOldHandler(
      handleUpdateLecture,
      'lectures-update',
      UpdateLectureSchema,
      true,
    ),
    delete: wrapOldHandler(
      handleDeleteLecture,
      'lectures-delete',
      DeleteLectureSchema,
      true,
    ),
    restore: wrapOldHandler(
      handleRestoreLecture,
      'lectures-restore',
      RestoreLectureSchema,
      true,
    ),
    'delete-permanently': wrapOldHandler(
      handleDeletePermanently,
      'lectures-delete-permanently',
      DeleteLectureSchema,
      true,
    ),
    list: wrapOldHandler(handleListLectures, 'lectures-list', undefined, false),
    get: wrapOldHandler(handleGetLecture, 'lectures-get', undefined, false),
  };

  return action ? handlers[action] : undefined;
}
