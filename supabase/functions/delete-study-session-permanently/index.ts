// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
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
import { DeleteStudySessionPermanentlySchema } from '../_shared/schemas/deletePermanently.ts';

async function handleDeleteStudySessionPermanently(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);

  // Schema transformation ensures study_session_id is always present
  const studySessionId = body.study_session_id;

  await logger.warn(
    'Permanent deletion requested',
    {
      user_id: user.id,
      study_session_id: studySessionId,
      type: 'study_session',
    },
    traceContext,
  );

  // SECURITY: Verify ownership before permanent deletion
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

  // Permanently delete
  const { error: deleteError } = await supabaseClient
    .from('study_sessions')
    .delete()
    .eq('id', studySessionId);

  if (deleteError) throw handleDbError(deleteError);

  await logger.warn(
    'Study session permanently deleted',
    { user_id: user.id, study_session_id: studySessionId },
    traceContext,
  );

  // Maintain backward compatibility with existing response format
  return { message: 'Study session permanently deleted.' };
}

serve(
  createAuthenticatedHandler(handleDeleteStudySessionPermanently, {
    rateLimitName: 'delete-study-session-permanently',
    schema: DeleteStudySessionPermanentlySchema,
    requireIdempotency: true,
  }),
);
