import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
} from '../_shared/function-handler.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';

/**
 * Handler for getting user streak information
 * Returns current_streak and longest_streak, or 0,0 if no streak exists yet
 */
async function handleGetStreakInfo(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;

  // Fetch the user's streak information
  const { data: streakData, error: streakError } = await supabaseClient
    .from('streaks')
    .select('current_streak, longest_streak')
    .eq('user_id', user.id)
    .single();

  if (streakError) {
    // If no row was found (PGRST116), user hasn't started a streak yet - return default values
    if (streakError.code === 'PGRST116') {
      return { current_streak: 0, longest_streak: 0 };
    }
    // For any other error, use standard error handling
    throw handleDbError(streakError);
  }

  // If data is null but there was no error, default to 0
  return streakData || { current_streak: 0, longest_streak: 0 };
}

serve(
  createAuthenticatedHandler(handleGetStreakInfo, {
    rateLimitName: 'get-streak-info',
    // No schema needed - GET request with no body
  }),
);
