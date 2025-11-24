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
import { UpdateAssignmentSchema } from '../_shared/schemas/assignment.ts';
import { encrypt } from '../_shared/encryption.ts';

async function handleUpdateAssignment(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const { assignment_id, ...updates } = body;
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey)
    throw new AppError(
      'Encryption key not configured.',
      500,
      ERROR_CODES.CONFIG_ERROR,
    );

  await logger.info(
    'Verifying assignment ownership',
    { user_id: user.id, assignment_id },
    traceContext,
  );

  // SECURITY: Verify ownership before updating
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

  // Encrypt fields if they are being updated
  const encryptedUpdates = { ...updates };
  if (updates.title) {
    encryptedUpdates.title = await encrypt(updates.title, encryptionKey);
  }
  if (updates.description) {
    encryptedUpdates.description = await encrypt(
      updates.description,
      encryptionKey,
    );
  }

  const { data, error: updateError } = await supabaseClient
    .from('assignments')
    .update({
      ...encryptedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignment_id)
    .select()
    .single();

  if (updateError) throw handleDbError(updateError);

  await logger.info(
    'Successfully updated assignment',
    { user_id: user.id, assignment_id },
    traceContext,
  );
  return data;
}

serve(
  createAuthenticatedHandler(handleUpdateAssignment, {
    rateLimitName: 'update-assignment',
    schema: UpdateAssignmentSchema,
  }),
);
