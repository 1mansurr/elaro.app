import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
  AppError,
} from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { UpdateCourseSchema } from '../_shared/schemas/course.ts';
import { encrypt } from '../_shared/encryption.ts';

async function handleUpdateCourse(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const { course_id, ...updates } = body;
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey)
    throw new AppError(
      'Encryption key not configured.',
      500,
      ERROR_CODES.CONFIG_ERROR,
    );

  await logger.info(
    'Verifying course ownership',
    { user_id: user.id, course_id },
    traceContext,
  );

  // SECURITY: Verify ownership before updating
  const { data: existing, error: checkError } = await supabaseClient
    .from('courses')
    .select('id')
    .eq('id', course_id)
    .eq('user_id', user.id)
    .single();

  if (checkError || !existing) {
    if (checkError) {
      throw handleDbError(checkError);
    }
    throw new AppError(
      'Course not found or access denied.',
      404,
      ERROR_CODES.DB_NOT_FOUND,
    );
  }

  // Encrypt fields if they are being updated
  const encryptedUpdates = { ...updates };
  if (updates.course_name) {
    encryptedUpdates.course_name = await encrypt(
      updates.course_name,
      encryptionKey,
    );
  }
  if (updates.about_course) {
    encryptedUpdates.about_course = await encrypt(
      updates.about_course,
      encryptionKey,
    );
  }

  const { data, error: updateError } = await supabaseClient
    .from('courses')
    .update({
      ...encryptedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', course_id)
    .select()
    .single();

  if (updateError) throw handleDbError(updateError);

  await logger.info(
    'Successfully updated course',
    { user_id: user.id, course_id },
    traceContext,
  );
  return data;
}

serve(
  createAuthenticatedHandler(handleUpdateCourse, {
    rateLimitName: 'update-course',
    schema: UpdateCourseSchema,
  }),
);
