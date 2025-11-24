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
import { DeleteStudySessionSchema } from '../_shared/schemas/studySession.ts';

async function handleDeleteStudySession(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const { session_id } = body;

  await logger.info(
    'Verifying study session ownership',
    { user_id: user.id, session_id },
    traceContext,
  );

  // SECURITY: Verify ownership before deleting
  const { data: existing, error: checkError } = await supabaseClient
    .from('study_sessions')
    .select('id')
    .eq('id', session_id)
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

  // Perform soft delete
  const { error: deleteError } = await supabaseClient
    .from('study_sessions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', session_id);

  if (deleteError) throw handleDbError(deleteError);

  await logger.info(
    'Successfully soft deleted study session',
    { user_id: user.id, session_id },
    traceContext,
  );

  return { success: true, message: 'Study session deleted successfully.' };
}

serve(
  createAuthenticatedHandler(handleDeleteStudySession, {
    rateLimitName: 'delete-study-session',
    schema: DeleteStudySessionSchema,
  }),
);
