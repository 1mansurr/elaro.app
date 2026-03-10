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

const SuspendAccountSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(1),
  duration: z.number().optional(), // Duration in days, null for indefinite
  adminNotes: z.string().optional(),
});

async function handleSuspendAccount(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const { userId, reason, duration, adminNotes } = body;

  // SECURITY: Only admins can suspend accounts
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

  // Prevent admins from suspending themselves
  if (userId === user.id) {
    throw new AppError(
      'Cannot suspend your own account',
      400,
      ERROR_CODES.INVALID_INPUT,
    );
  }

  // Check if target user exists and is not already suspended
  const { data: targetUser, error: targetError } = await supabaseClient
    .from('users')
    .select('id, email, account_status')
    .eq('id', userId)
    .single();

  if (targetError) throw handleDbError(targetError);

  const targetUserTyped = targetUser as {
    id: string;
    email: string;
    account_status: string;
  } | null;

  if (!targetUserTyped) {
    throw new AppError('User not found', 404, ERROR_CODES.DB_NOT_FOUND);
  }

  if (targetUserTyped.account_status === 'suspended') {
    throw new AppError(
      'Account is already suspended',
      400,
      ERROR_CODES.ALREADY_EXISTS,
    );
  }

  if (targetUserTyped.account_status === 'deleted') {
    throw new AppError(
      'Cannot suspend a deleted account',
      400,
      ERROR_CODES.INVALID_INPUT,
    );
  }

  await logger.info(
    'Admin suspending account',
    { admin_id: user.id, target_user_id: userId, email: targetUserTyped.email },
    traceContext,
  );

  const now = new Date().toISOString();
  const suspensionData: Record<string, unknown> = {
    account_status: 'suspended',
    updated_at: now,
  };

  // Set suspension end date if duration is specified
  const durationTyped = typeof duration === 'number' ? duration : undefined;
  if (durationTyped && durationTyped > 0) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationTyped);
    suspensionData.suspension_end_date = endDate.toISOString();
  }

  const { data, error: updateError } = await supabaseClient
    .from('users')
    .update(suspensionData)
    .eq('id', userId)
    .select()
    .single();

  if (updateError) throw handleDbError(updateError);

  // Log the suspension action
  const { error: logError } = await supabaseClient
    .from('admin_actions')
    .insert({
      admin_id: user.id,
      target_user_id: userId,
      action: 'suspend_account',
      reason,
      admin_notes: adminNotes,
      metadata: {
        duration: durationTyped,
        suspension_end_date: suspensionData.suspension_end_date,
        target_user_email: targetUserTyped.email,
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

  // Sign out the suspended user from all sessions
  const { error: signOutError } = await supabaseClient.auth.signOut();
  if (signOutError) {
    await logger.error(
      'Error signing out suspended user',
      {
        admin_id: user.id,
        target_user_id: userId,
        error: signOutError.message,
      },
      traceContext,
    );
    // Don't throw here as the main operation succeeded
  }

  await logger.info(
    'Successfully suspended account',
    { admin_id: user.id, target_user_id: userId },
    traceContext,
  );
  return {
    message: 'Account suspended successfully',
    user: data,
    suspensionDetails: {
      duration: duration || 'indefinite',
      endDate: suspensionData.suspension_end_date || null,
    },
  };
}

serve(
  createAuthenticatedHandler(handleSuspendAccount, {
    rateLimitName: 'suspend-account',
    schema: SuspendAccountSchema,
  }),
);
