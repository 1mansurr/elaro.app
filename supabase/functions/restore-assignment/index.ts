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
import { RestoreAssignmentSchema } from '../_shared/schemas/restore.ts';

async function handleRestoreAssignment(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);

  // Schema transformation ensures assignment_id is always present
  const assignmentId = body.assignment_id;

  await logger.info(
    'Verifying assignment ownership',
    { user_id: user.id, assignment_id: assignmentId },
    traceContext,
  );

  // SECURITY: Verify ownership before restoring
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

  // Restore by setting deleted_at to null
  const { error: restoreError } = await supabaseClient
    .from('assignments')
    .update({ deleted_at: null })
    .eq('id', assignmentId);

  if (restoreError) throw handleDbError(restoreError);

  await logger.info(
    'Successfully restored assignment',
    { user_id: user.id, assignment_id: assignmentId },
    traceContext,
  );

  // Maintain backward compatibility with existing response format
  return { message: 'Assignment restored successfully.' };
}

serve(
  createAuthenticatedHandler(handleRestoreAssignment, {
    rateLimitName: 'restore-assignment',
    schema: RestoreAssignmentSchema,
    requireIdempotency: true,
  }),
);
