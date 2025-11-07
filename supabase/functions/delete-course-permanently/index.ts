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
import { DeleteCoursePermanentlySchema } from '../_shared/schemas/deletePermanently.ts';

async function handleDeleteCoursePermanently(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);

  // Schema transformation ensures course_id is always present
  const courseId = body.course_id;

  await logger.warn(
    'Permanent deletion requested',
    { user_id: user.id, course_id: courseId, type: 'course' },
    traceContext,
  );

  // SECURITY: Verify ownership before permanent deletion
  const { data: existing, error: checkError } = await supabaseClient
    .from('courses')
    .select('id')
    .eq('id', courseId)
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

  // Permanently delete
  const { error: deleteError } = await supabaseClient
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (deleteError) throw handleDbError(deleteError);

  await logger.warn(
    'Course permanently deleted',
    { user_id: user.id, course_id: courseId },
    traceContext,
  );

  // Maintain backward compatibility with existing response format
  return { message: 'Course permanently deleted.' };
}

serve(
  createAuthenticatedHandler(handleDeleteCoursePermanently, {
    rateLimitName: 'delete-course-permanently',
    schema: DeleteCoursePermanentlySchema,
    requireIdempotency: true,
  }),
);
