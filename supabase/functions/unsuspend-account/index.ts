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
import { z } from 'zod';

const UnsuspendAccountSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(1),
  adminNotes: z.string().optional(),
});

async function handleUnsuspendAccount(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const { userId, reason, adminNotes } = body;

  // SECURITY: Only admins can unsuspend accounts
  const { data: adminUser, error: adminError } = await supabaseClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (adminError) throw handleDbError(adminError);

  const adminUserTyped = adminUser as { role?: string } | null;
  if (!adminUserTyped || adminUserTyped.role !== 'admin') {
    throw new AppError(
      'Unauthorized: Admin access required',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  // Check if target user exists and is suspended
  const { data: targetUser, error: targetError } = await supabaseClient
    .from('users')
    .select('id, email, account_status, suspension_end_date')
    .eq('id', userId)
    .single();

  if (targetError) throw handleDbError(targetError);

  const targetUserTyped = targetUser as {
    id: string;
    email: string;
    account_status: string;
    suspension_end_date: string | null;
  } | null;

  if (!targetUserTyped) {
    throw new AppError('User not found', 404, ERROR_CODES.DB_NOT_FOUND);
  }

  if (targetUserTyped.account_status !== 'suspended') {
    throw new AppError(
      'Account is not suspended',
      400,
      ERROR_CODES.INVALID_INPUT,
    );
  }

  await logger.info(
    'Admin unsuspending account',
    { admin_id: user.id, target_user_id: userId, email: targetUserTyped.email },
    traceContext,
  );

  const now = new Date().toISOString();
  const { data, error: updateError } = await supabaseClient
    .from('users')
    .update({
      account_status: 'active',
      suspension_end_date: null,
      updated_at: now,
    })
    .eq('id', userId)
    .select()
    .single();

  if (updateError) throw handleDbError(updateError);

  // Log the unsuspension action
  const { error: logError } = await supabaseClient
    .from('admin_actions')
    .insert({
      admin_id: user.id,
      target_user_id: userId,
      action: 'unsuspend_account',
      reason,
      admin_notes: adminNotes,
      metadata: {
        target_user_email: targetUserTyped.email,
        previous_suspension_end_date: targetUserTyped.suspension_end_date,
      },
    });

  if (logError) {
    await logger.error(
      'Error logging admin action',
      { admin_id: user.id, target_user_id: userId, error: logError.message },
      traceContext,
    );
    // Don't throw here as the main operation succeeded
  }

  await logger.info(
    'Successfully unsuspended account',
    { admin_id: user.id, target_user_id: userId },
    traceContext,
  );
  return {
    message: 'Account unsuspended successfully',
    user: data,
  };
}

serve(
  createAuthenticatedHandler(handleUnsuspendAccount, {
    rateLimitName: 'unsuspend-account',
    schema: UnsuspendAccountSchema,
    requireIdempotency: true,
  }),
);
