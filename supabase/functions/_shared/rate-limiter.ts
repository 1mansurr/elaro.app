// FILE: supabase/functions/_shared/rate-limiter.ts
// ACTION: Create a new shared utility for rate limiting Edge Functions.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const RATE_LIMIT_COUNT = 20; // Max 20 requests
const RATE_LIMIT_INTERVAL_MINUTES = 1; // per 1 minute

class RateLimitError extends Error {
  constructor(message = 'Too many requests. Please try again later.' ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export async function checkRateLimit(
  supabaseClient: SupabaseClient,
  userId: string,
  functionName: string
) {
  // Log the current request
  const { error: logError } = await supabaseClient
    .from('function_request_logs')
    .insert({ user_id: userId, function_name: functionName });

  if (logError) {
    console.error(`[${functionName}] Error logging request for rate limiting:`, logError);
    // Fail open: If logging fails, we don't block the request, but we log the error.
    return;
  }

  // Check the number of requests in the last interval
  const intervalStart = new Date(Date.now() - RATE_LIMIT_INTERVAL_MINUTES * 60 * 1000).toISOString();

  const { count, error: countError } = await supabaseClient
    .from('function_request_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('function_name', functionName)
    .gte('created_at', intervalStart);

  if (countError) {
    console.error(`[${functionName}] Error counting requests for rate limiting:`, countError);
    // Fail open: If counting fails, we don't block the request.
    return;
  }

  if (count !== null && count > RATE_LIMIT_COUNT) {
    throw new RateLimitError(`Rate limit exceeded for function: ${functionName}`);
  }
}

// Re-export the error for easy catching in functions
export { RateLimitError };
