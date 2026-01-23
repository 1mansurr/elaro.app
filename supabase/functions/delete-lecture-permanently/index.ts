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
import { DeleteLecturePermanentlySchema } from '../_shared/schemas/deletePermanently.ts';

async function handleDeleteLecturePermanently(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);

  // Schema transformation ensures lecture_id is always present
  const lectureId = body.lecture_id;

  await logger.warn(
    'Permanent deletion requested',
    { user_id: user.id, lecture_id: lectureId, type: 'lecture' },
    traceContext,
  );

  // SECURITY: Verify ownership before permanent deletion
  const { data: existing, error: checkError } = await supabaseClient
    .from('lectures')
    .select('id')
    .eq('id', lectureId)
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

  // Permanently delete
  const { error: deleteError } = await supabaseClient
    .from('lectures')
    .delete()
    .eq('id', lectureId);

  if (deleteError) throw handleDbError(deleteError);

  await logger.warn(
    'Lecture permanently deleted',
    { user_id: user.id, lecture_id: lectureId },
    traceContext,
  );

  // Maintain backward compatibility with existing response format
  return { message: 'Lecture permanently deleted.' };
}

serve(
  createAuthenticatedHandler(handleDeleteLecturePermanently, {
    rateLimitName: 'delete-lecture-permanently',
    schema: DeleteLecturePermanentlySchema,
    requireIdempotency: true,
  }),
);
