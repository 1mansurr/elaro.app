import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';

async function handleStartUserTrial({ user, supabaseClient }: AuthenticatedRequest) {
  console.log(`Starting trial for user: ${user.id}`);

  // Fetch the user's current subscription tier
  const { data: userProfile, error: profileError } = await supabaseClient
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw new AppError(profileError.message, 500, 'DB_QUERY_ERROR');
  }

  if (!userProfile) {
    throw new AppError('User profile not found', 404, 'USER_NOT_FOUND');
  }

  // Only start a trial if the user is currently on the 'free' tier.
  // This prevents re-starting trials for users who already have one or are paying.
  if (userProfile.subscription_tier === 'free') {
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        subscription_tier: 'oddity',
        subscription_expires_at: trialEndDate.toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
    }

    console.log(`Trial started successfully for user: ${user.id}, expires: ${trialEndDate.toISOString()}`);
    return { 
      success: true, 
      message: 'Trial started successfully.',
      trial_expires_at: trialEndDate.toISOString()
    };
  }

  // If the user is not on the 'free' tier, do nothing and return a success message.
  console.log(`User ${user.id} is not on free tier (current: ${userProfile.subscription_tier}). No action taken.`);
  return { 
    success: true, 
    message: 'User is not on the free tier. No action taken.',
    current_tier: userProfile.subscription_tier
  };
}

serve(createAuthenticatedHandler(
  handleStartUserTrial,
  {
    rateLimitName: 'start-user-trial',
    // No schema needed since this function doesn't require any input body
  }
));
