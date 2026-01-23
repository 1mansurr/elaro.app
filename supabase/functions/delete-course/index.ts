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
import { DeleteCourseSchema } from '../_shared/schemas/course.ts';

async function handleDeleteCourse(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const { course_id } = body;

  await logger.info(
    'Verifying course ownership',
    { user_id: user.id, course_id },
    traceContext,
  );

  // SECURITY: Verify ownership before deleting
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

  // Perform the soft delete by setting the deleted_at timestamp
  const { error: deleteError } = await supabaseClient
    .from('courses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', course_id);

  if (deleteError) throw handleDbError(deleteError);

  await logger.info(
    'Successfully soft deleted course',
    { user_id: user.id, course_id },
    traceContext,
  );

  return { success: true, message: 'Course deleted successfully.' };
}

serve(
  createAuthenticatedHandler(handleDeleteCourse, {
    rateLimitName: 'delete-course',
    schema: DeleteCourseSchema,
  }),
);
