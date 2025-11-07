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
import { RestoreStudySessionSchema } from '../_shared/schemas/restore.ts';

async function handleRestoreStudySession(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);

  // Schema transformation ensures study_session_id is always present
  const studySessionId = body.study_session_id;

  await logger.info(
    'Verifying study session ownership',
    { user_id: user.id, study_session_id: studySessionId },
    traceContext,
  );

  // SECURITY: Verify ownership before restoring
  const { data: existing, error: checkError } = await supabaseClient
    .from('study_sessions')
    .select('id')
    .eq('id', studySessionId)
    .eq('user_id', user.id)
    .single();

  if (checkError || !existing) {
    if (checkError) {
      throw handleDbError(checkError);
    }
    throw new AppError(
      'Study session not found or access denied.',
      404,
      ERROR_CODES.DB_NOT_FOUND,
    );
  }

  // Restore by setting deleted_at to null
  const { error: restoreError } = await supabaseClient
    .from('study_sessions')
    .update({ deleted_at: null })
    .eq('id', studySessionId);

  if (restoreError) throw handleDbError(restoreError);

  await logger.info(
    'Successfully restored study session',
    { user_id: user.id, study_session_id: studySessionId },
    traceContext,
  );

  // Maintain backward compatibility with existing response format
  return { message: 'Study session restored successfully.' };
}

serve(
  createAuthenticatedHandler(handleRestoreStudySession, {
    rateLimitName: 'restore-study-session',
    schema: RestoreStudySessionSchema,
    requireIdempotency: true,
  }),
);
