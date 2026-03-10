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

async function handleRestoreAccount(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const traceContext = extractTraceContext(req as unknown as Request);

  await logger.info(
    'Attempting to restore account',
    { user_id: user.id },
    traceContext,
  );

  // Check if user account is in deleted status
  const { data: userData, error: fetchError } = await supabaseClient
    .from('users')
    .select('account_status, deletion_scheduled_at')
    .eq('id', user.id)
    .single();

  if (fetchError) throw handleDbError(fetchError);

  if (!userData) {
    throw new AppError('User not found', 404, ERROR_CODES.DB_NOT_FOUND);
  }

  const userDataTyped = userData as {
    account_status: string;
    deletion_scheduled_at: string | null;
  };

  if (userDataTyped.account_status !== 'deleted') {
    throw new AppError(
      'Account is not in deleted status',
      400,
      ERROR_CODES.INVALID_INPUT,
    );
  }

  // Check if 7 days have passed
  if (userDataTyped.deletion_scheduled_at) {
    const deletionDate = new Date(userDataTyped.deletion_scheduled_at);
    const now = new Date();

    if (now > deletionDate) {
      throw new AppError(
        'Account restoration period has expired',
        400,
        ERROR_CODES.INVALID_INPUT,
      );
    }
  }

  // Restore the account
  const now = new Date().toISOString();
  const { data, error: updateError } = await supabaseClient
    .from('users')
    .update({
      account_status: 'active',
      deleted_at: null,
      deletion_scheduled_at: null,
      updated_at: now,
    })
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) throw handleDbError(updateError);

  await logger.info(
    'Successfully restored account',
    { user_id: user.id },
    traceContext,
  );
  return {
    message: 'Account restored successfully',
    user: data,
  };
}

serve(
  createAuthenticatedHandler(handleRestoreAccount, {
    rateLimitName: 'restore-account',
  }),
);
