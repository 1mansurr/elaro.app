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
import { DeleteLectureSchema } from '../_shared/schemas/lecture.ts';

async function handleDeleteLecture(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const { lecture_id } = body;

  await logger.info(
    'Verifying lecture ownership',
    { user_id: user.id, lecture_id },
    traceContext,
  );

  // SECURITY: Verify ownership before deleting
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

  // Perform soft delete
  const { error: deleteError } = await supabaseClient
    .from('lectures')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', lecture_id);

  if (deleteError) throw handleDbError(deleteError);

  await logger.info(
    'Successfully soft deleted lecture',
    { user_id: user.id, lecture_id },
    traceContext,
  );

  return { success: true, message: 'Lecture deleted successfully.' };
}

serve(
  createAuthenticatedHandler(handleDeleteLecture, {
    rateLimitName: 'delete-lecture',
    schema: DeleteLectureSchema,
  }),
);
