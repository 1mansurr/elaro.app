import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

// Rate limiting configuration
const RATE_LIMITS = {
  'create-assignment': { requests: 10, window: 60 }, // 10 requests per minute
  'create-lecture': { requests: 10, window: 60 },
  'create-study-session': { requests: 10, window: 60 },
  'create-course': { requests: 5, window: 60 },
  'send-notification': { requests: 20, window: 60 },
  'default': { requests: 5, window: 60 },
};

// Rate limit error class
export class RateLimitError extends Error {
  constructor(message: string) {
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

  // Get recent requests for this user and action
  const { data: recentRequests, error } = await supabaseClient
    .from('rate_limits')
    .select('*')
    .eq('user_id', userId)
    .eq('action', actionName)
    .gte('created_at', windowStart.toISOString());

  if (error) {
    console.error('Rate limit check error:', error);
    // If we can't check rate limits, we'll be permissive to avoid blocking legitimate requests
    return;
  }

  // Check if user has exceeded the limit
  if (recentRequests && recentRequests.length >= config.requests) {
    throw new RateLimitError(
      `Rate limit exceeded. Maximum ${config.requests} requests per ${config.window} seconds.`
    );
  }

  // Record this request
  await supabaseClient
    .from('rate_limits')
    .insert({
      user_id: userId,
      action: actionName,
      created_at: now.toISOString(),
    });

  // Clean up old rate limit records (older than the window)
  await supabaseClient
    .from('rate_limits')
    .delete()
    .lt('created_at', windowStart.toISOString());
}