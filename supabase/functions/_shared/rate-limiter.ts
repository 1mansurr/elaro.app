import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

// Rate limiting configuration - Per-user limits
const RATE_LIMITS = {
  'create-assignment': { requests: 100, window: 60 }, // 100 requests per minute per user
  'create-lecture': { requests: 100, window: 60 },
  'create-study-session': { requests: 100, window: 60 },
  'create-course': { requests: 50, window: 60 },
  'update-assignment': { requests: 200, window: 60 },
  'update-course': { requests: 200, window: 60 },
  'update-lecture': { requests: 200, window: 60 },
  'update-study-session': { requests: 200, window: 60 },
  'delete-assignment': { requests: 50, window: 60 },
  'delete-course': { requests: 50, window: 60 },
  'delete-lecture': { requests: 50, window: 60 },
  'delete-study-session': { requests: 50, window: 60 },
  'send-notification': { requests: 100, window: 60 },
  'default': { requests: 100, window: 60 }, // 100 requests per minute per user by default
};

// Rate limit error class
export class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Check rate limit for a user
export async function checkRateLimit(
  supabaseClient: SupabaseClient,
  userId: string,
  actionName: string
): Promise<void> {
  const config = RATE_LIMITS[actionName as keyof typeof RATE_LIMITS] || RATE_LIMITS.default;
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.window * 1000);

  try {
    // Get recent requests for this user and action
    const { data: recentRequests, error } = await supabaseClient
      .from('rate_limits')
      .select('created_at')
      .eq('user_id', userId)
      .eq('action', actionName)
      .gte('created_at', windowStart.toISOString());

    if (error) {
      console.error('Rate limit check error:', error);
      // If we can't check rate limits, we'll be permissive to avoid blocking legitimate requests
      console.warn('Rate limit check failed, allowing request to proceed');
      return;
    }

    // Check if user has exceeded the limit
    if (recentRequests && recentRequests.length >= config.requests) {
      const oldestRequest = recentRequests[recentRequests.length - 1];
      const oldestRequestTime = new Date(oldestRequest.created_at);
      const retryAfter = Math.ceil((oldestRequestTime.getTime() + config.window * 1000 - now.getTime()) / 1000);
      
      throw new RateLimitError(
        `Rate limit exceeded. Maximum ${config.requests} requests per ${config.window} seconds. Please try again in ${retryAfter} seconds.`,
        retryAfter
      );
    }

    // Record this request
    const { error: insertError } = await supabaseClient
      .from('rate_limits')
      .insert({
        user_id: userId,
        action: actionName,
        created_at: now.toISOString(),
      });

    if (insertError) {
      console.error('Failed to record rate limit:', insertError);
      // Don't throw - this is non-critical
    }

  } catch (error) {
    // Re-throw RateLimitError
    if (error instanceof RateLimitError) {
      throw error;
    }
    // Log unexpected errors but don't block the request
    console.error('Unexpected error in rate limit check:', error);
  }
}

// Clean up old rate limit records (can be called periodically)
export async function cleanupOldRateLimits(
  supabaseClient: SupabaseClient,
  olderThanMinutes: number = 5
): Promise<void> {
  const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  const { error } = await supabaseClient
    .from('rate_limits')
    .delete()
    .lt('created_at', cutoffTime.toISOString());

  if (error) {
    console.error('Failed to cleanup old rate limits:', error);
  } else {
    console.log(`Cleaned up rate limit records older than ${olderThanMinutes} minutes`);
  }
}