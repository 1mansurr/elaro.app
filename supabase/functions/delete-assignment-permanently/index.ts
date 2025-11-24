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
import { DeleteAssignmentPermanentlySchema } from '../_shared/schemas/deletePermanently.ts';

async function handleDeleteAssignmentPermanently(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);

  // Schema transformation ensures assignment_id is always present
  const assignmentId = body.assignment_id;

  await logger.warn(
    'Permanent deletion requested',
    { user_id: user.id, assignment_id: assignmentId, type: 'assignment' },
    traceContext,
  );

  // SECURITY: Verify ownership before permanent deletion
  const { data: existing, error: checkError } = await supabaseClient
    .from('assignments')
    .select('id')
    .eq('id', assignmentId)
    .eq('user_id', user.id)
    .single();

  if (checkError || !existing) {
    if (checkError) {
      throw handleDbError(checkError);
    }
    throw new AppError(
      'Assignment not found or access denied.',
      404,
      ERROR_CODES.DB_NOT_FOUND,
    );
  }

  // Permanently delete
  const { error: deleteError } = await supabaseClient
    .from('assignments')
    .delete()
    .eq('id', assignmentId);

  if (deleteError) throw handleDbError(deleteError);

  await logger.warn(
    'Assignment permanently deleted',
    { user_id: user.id, assignment_id: assignmentId },
    traceContext,
  );

  // Maintain backward compatibility with existing response format
  return { message: 'Assignment permanently deleted.' };
}

serve(
  createAuthenticatedHandler(handleDeleteAssignmentPermanently, {
    rateLimitName: 'delete-assignment-permanently',
    schema: DeleteAssignmentPermanentlySchema,
    requireIdempotency: true,
  }),
);
