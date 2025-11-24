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
import { z } from 'zod';

const SoftDeleteAccountSchema = z.object({
  reason: z.string().optional(),
});

async function handleSoftDeleteAccount(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const { reason } = body;

  await logger.info(
    'Soft deleting account',
    { user_id: user.id },
    traceContext,
  );

  // Check if account is already deleted
  const { data: currentUser, error: fetchError } = await supabaseClient
    .from('users')
    .select('account_status')
    .eq('id', user.id)
    .single();

  if (fetchError) throw handleDbError(fetchError);

  if (currentUser.account_status === 'deleted') {
    throw new AppError(
      'Account is already deleted',
      400,
      ERROR_CODES.ALREADY_EXISTS,
    );
  }

  if (currentUser.account_status === 'suspended') {
    throw new AppError(
      'Cannot delete a suspended account',
      400,
      ERROR_CODES.INVALID_INPUT,
    );
  }

  const now = new Date().toISOString();
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 7); // 7 days from now

  // Update user account status to 'deleted' and set deletion timestamp
  const { data, error: updateError } = await supabaseClient
    .from('users')
    .update({
      account_status: 'deleted',
      deleted_at: now,
      deletion_scheduled_at: deletionDate.toISOString(),
      updated_at: now,
    })
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) throw handleDbError(updateError);

  // Sign out the user from all sessions
  const { error: signOutError } = await supabaseClient.auth.signOut({
    scope: 'global',
  });
  if (signOutError) {
    await logger.error(
      'Error signing out user',
      { user_id: user.id, error: signOutError.message },
      traceContext,
    );
    // Don't throw here as the main operation succeeded
  }

  await logger.info(
    'Successfully soft deleted account',
    { user_id: user.id },
    traceContext,
  );
  return {
    message:
      'Account deletion initiated. You have 7 days to restore your account.',
    deletionDate: deletionDate.toISOString(),
    reason: reason || 'User requested account deletion',
  };
}

serve(
  createAuthenticatedHandler(handleSoftDeleteAccount, {
    rateLimitName: 'soft-delete-account',
    schema: SoftDeleteAccountSchema,
    requireIdempotency: true,
  }),
);
