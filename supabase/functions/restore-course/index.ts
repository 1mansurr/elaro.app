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
import { RestoreCourseSchema } from '../_shared/schemas/restore.ts';

async function handleRestoreCourse(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);

  // Schema transformation ensures course_id is always present
  const courseId = body.course_id;

  await logger.info(
    'Verifying course ownership',
    { user_id: user.id, course_id: courseId },
    traceContext,
  );

  // SECURITY: Verify ownership before restoring
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

  // Restore by setting deleted_at to null
  const { error: restoreError } = await supabaseClient
    .from('courses')
    .update({ deleted_at: null })
    .eq('id', courseId);

  if (restoreError) throw handleDbError(restoreError);

  await logger.info(
    'Successfully restored course',
    { user_id: user.id, course_id: courseId },
    traceContext,
  );

  // Maintain backward compatibility with existing response format
  return { message: 'Course restored successfully.' };
}

serve(
  createAuthenticatedHandler(handleRestoreCourse, {
    rateLimitName: 'restore-course',
    schema: RestoreCourseSchema,
    requireIdempotency: true,
  }),
);
