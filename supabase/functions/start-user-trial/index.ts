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

async function handleStartUserTrial(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const traceContext = extractTraceContext(req as any);

  // Diagnostic logging to verify auth context
  const authHeader = (req as unknown as Request).headers.get('Authorization');
  await logger.info(
    'Starting trial for user',
    {
      user_id: user.id,
      has_auth_header: !!authHeader,
      auth_header_length: authHeader?.length || 0,
    },
    traceContext,
  );

  // Fetch the user's current subscription tier
  const { data: userProfile, error: profileError } = await supabaseClient
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw handleDbError(profileError);
  }

  if (!userProfile) {
    throw new AppError('User profile not found', 404, ERROR_CODES.DB_NOT_FOUND);
  }

  // Only start a trial if the user is currently on the 'free' tier.
  // This prevents re-starting trials for users who already have one or are paying.
  if (userProfile.subscription_tier === 'free') {
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        subscription_tier: 'oddity',
        subscription_status: 'trialing',
        subscription_expires_at: trialEndDate.toISOString(),
        trial_start_date: trialStartDate.toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      throw handleDbError(updateError);
    }

    await logger.info(
      'Trial started successfully',
      {
        user_id: user.id,
        trial_start_date: trialStartDate.toISOString(),
        trial_expires_at: trialEndDate.toISOString(),
      },
      traceContext,
    );

    return {
      success: true,
      message: 'Trial started successfully.',
      trial_start_date: trialStartDate.toISOString(),
      trial_expires_at: trialEndDate.toISOString(),
    };
  }

  // If the user is not on the 'free' tier, do nothing and return a success message.
  await logger.info(
    'User not on free tier, no action taken',
    {
      user_id: user.id,
      current_tier: userProfile.subscription_tier,
    },
    traceContext,
  );

  return {
    success: true,
    message: 'User is not on the free tier. No action taken.',
    current_tier: userProfile.subscription_tier,
  };
}

serve(
  createAuthenticatedHandler(handleStartUserTrial, {
    rateLimitName: 'start-user-trial',
    // No schema needed since this function doesn't require any input body
  }),
);
