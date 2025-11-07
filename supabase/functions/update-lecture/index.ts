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
import { UpdateLectureSchema } from '../_shared/schemas/lecture.ts';
import { encrypt } from '../_shared/encryption.ts';

async function handleUpdateLecture(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const { lecture_id, ...updates } = body;
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey)
    throw new AppError(
      'Encryption key not configured.',
      500,
      ERROR_CODES.CONFIG_ERROR,
    );

  await logger.info(
    'Verifying lecture ownership',
    { user_id: user.id, lecture_id },
    traceContext,
  );

  // SECURITY: Verify ownership before updating
  const { data: existing, error: checkError } = await supabaseClient
    .from('lectures')
    .select('id')
    .eq('id', lecture_id)
    .eq('user_id', user.id)
    .single();

  if (checkError || !existing) {
    if (checkError) {
      throw handleDbError(checkError);
    }
    throw new AppError(
      'Lecture not found or access denied.',
      404,
      ERROR_CODES.DB_NOT_FOUND,
    );
  }

  // Encrypt fields if they are being updated
  const encryptedUpdates = { ...updates };
  if (updates.lecture_name) {
    encryptedUpdates.lecture_name = await encrypt(
      updates.lecture_name,
      encryptionKey,
    );
  }
  if (updates.description) {
    encryptedUpdates.description = await encrypt(
      updates.description,
      encryptionKey,
    );
  }

  const { data, error: updateError } = await supabaseClient
    .from('lectures')
    .update({
      ...encryptedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lecture_id)
    .select()
    .single();

  if (updateError) throw handleDbError(updateError);

  await logger.info(
    'Successfully updated lecture',
    { user_id: user.id, lecture_id },
    traceContext,
  );
  return data;
}

serve(
  createAuthenticatedHandler(handleUpdateLecture, {
    rateLimitName: 'update-lecture',
    schema: UpdateLectureSchema,
  }),
);
