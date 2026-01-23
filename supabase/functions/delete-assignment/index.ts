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
import { DeleteAssignmentSchema } from '../_shared/schemas/assignment.ts';

async function handleDeleteAssignment(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const { assignment_id } = body;

  await logger.info(
    'Verifying assignment ownership',
    { user_id: user.id, assignment_id },
    traceContext,
  );

  // SECURITY: Verify ownership before deleting
  const { data: existing, error: checkError } = await supabaseClient
    .from('assignments')
    .select('id')
    .eq('id', assignment_id)
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

  // Perform soft delete
  const { error: deleteError } = await supabaseClient
    .from('assignments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', assignment_id);

  if (deleteError) throw handleDbError(deleteError);

  await logger.info(
    'Successfully soft deleted assignment',
    { user_id: user.id, assignment_id },
    traceContext,
  );

  return { success: true, message: 'Assignment deleted successfully.' };
}

serve(
  createAuthenticatedHandler(handleDeleteAssignment, {
    rateLimitName: 'delete-assignment',
    schema: DeleteAssignmentSchema,
  }),
);
