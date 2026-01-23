// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { logger } from './logging.ts';

// Rate limiting configuration - Per-user and per-IP limits
interface RateLimitConfig {
  perUser: { requests: number; window: number };
  perIP: { requests: number; window: number };
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'create-assignment': {
    perUser: { requests: 100, window: 60 },
    perIP: { requests: 200, window: 60 }, // Higher IP limit for multiple users
  },
  'create-lecture': {
    perUser: { requests: 100, window: 60 },
    perIP: { requests: 200, window: 60 },
  },
  'create-study-session': {
    perUser: { requests: 100, window: 60 },
    perIP: { requests: 200, window: 60 },
  },
  'create-course': {
    perUser: { requests: 50, window: 60 },
    perIP: { requests: 100, window: 60 },
  },
  'update-assignment': {
    perUser: { requests: 200, window: 60 },
    perIP: { requests: 400, window: 60 },
  },
  'update-course': {
    perUser: { requests: 200, window: 60 },
    perIP: { requests: 400, window: 60 },
  },
  'update-lecture': {
    perUser: { requests: 200, window: 60 },
    perIP: { requests: 400, window: 60 },
  },
  'update-study-session': {
    perUser: { requests: 200, window: 60 },
    perIP: { requests: 400, window: 60 },
  },
  'delete-assignment': {
    perUser: { requests: 50, window: 60 },
    perIP: { requests: 100, window: 60 },
  },
  'delete-course': {
    perUser: { requests: 50, window: 60 },
    perIP: { requests: 100, window: 60 },
  },
  'delete-lecture': {
    perUser: { requests: 50, window: 60 },
    perIP: { requests: 100, window: 60 },
  },
  'delete-study-session': {
    perUser: { requests: 50, window: 60 },
    perIP: { requests: 100, window: 60 },
  },
  'send-notification': {
    perUser: { requests: 100, window: 60 },
    perIP: { requests: 200, window: 60 },
  },
  default: {
    perUser: { requests: 100, window: 60 },
    perIP: { requests: 200, window: 60 },
  },
};

// Rate limit error class
export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Rate limit info returned to caller
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  degraded?: boolean; // True if rate limit check failed and conservative limits applied
}

/**
 * Extract IP address from request headers
 * Handles proxy headers (X-Forwarded-For, X-Real-IP)
 */
export function extractIPAddress(req: Request): string {
  // Try X-Forwarded-For (behind proxy/load balancer)
  const forwarded = req.headers.get('X-Forwarded-For');
  if (forwarded) {
    // Take the first IP (client IP, before any proxies)
    return forwarded.split(',')[0].trim();
  }

  // Try X-Real-IP (nginx proxy)
  const realIP = req.headers.get('X-Real-IP');
  if (realIP) {
    return realIP.trim();
  }

  // Fallback (won't work in Supabase Edge Functions, but good for local dev)
  return 'unknown';
}

/**
 * Check IP-based rate limit
 */
async function checkIPRateLimit(
  supabaseClient: SupabaseClient,
  ipAddress: string,
  actionName: string,
  config: RateLimitConfig,
): Promise<RateLimitInfo> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.perIP.window * 1000);

  try {
    // Get recent requests for this IP and action
    const { data: recentRequests, error } = await supabaseClient
      .from('ip_rate_limits')
      .select('created_at')
      .eq('ip_address', ipAddress)
      .eq('action', actionName)
      .gte('created_at', windowStart.toISOString());

    if (error) {
      await logger.warn(
        'IP rate limit check error',
        { error: error.message, ip_address: ipAddress, action: actionName },
        { traceId: 'utility' },
      );
      // Fail-secure: apply conservative default limits
      await logger.warn(
        'IP rate limit check failed, applying conservative limits',
        { ip_address: ipAddress, action: actionName },
        { traceId: 'utility' },
      );
      return {
        limit: 10, // Very conservative
        remaining: 10,
        reset: Math.ceil((now.getTime() + 60 * 1000) / 1000),
        degraded: true,
      };
    }

    const requestCount = recentRequests?.length || 0;
    const remaining = Math.max(0, config.perIP.requests - requestCount);
    const resetTime = Math.ceil(
      (windowStart.getTime() + config.perIP.window * 1000) / 1000,
    );

    // Check if IP has exceeded the limit
    if (requestCount >= config.perIP.requests) {
      const oldestRequest = recentRequests[recentRequests.length - 1];
      const oldestRequestTime = new Date(oldestRequest.created_at);
      const retryAfter = Math.ceil(
        (oldestRequestTime.getTime() +
          config.perIP.window * 1000 -
          now.getTime()) /
          1000,
      );

      throw new RateLimitError(
        `Rate limit exceeded for your IP address. Maximum ${config.perIP.requests} requests per ${config.perIP.window} seconds. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      );
    }

    // Record this request
    const { error: insertError } = await supabaseClient
      .from('ip_rate_limits')
      .insert({
        ip_address: ipAddress,
        action: actionName,
        created_at: now.toISOString(),
      });

    if (insertError) {
      await logger.warn(
        'Failed to record IP rate limit',
        {
          error: insertError.message,
          ip_address: ipAddress,
          action: actionName,
        },
        { traceId: 'utility' },
      );
      // Non-critical, don't throw
    }

    return {
      limit: config.perIP.requests,
      remaining,
      reset: resetTime,
    };
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    // Fail-secure on unexpected errors
    await logger.error(
      'Unexpected error in IP rate limit check',
      {
        error: error instanceof Error ? error.message : String(error),
        ip_address: ipAddress,
        action: actionName,
      },
      { traceId: 'utility' },
    );
    return {
      limit: 10,
      remaining: 10,
      reset: Math.ceil((now.getTime() + 60 * 1000) / 1000),
      degraded: true,
    };
  }
}

/**
 * Check rate limit for both user and IP address
 * Most restrictive limit applies
 */
export async function checkRateLimit(
  supabaseClient: SupabaseClient,
  userId: string,
  actionName: string,
  req?: Request,
): Promise<RateLimitInfo> {
  const config = RATE_LIMITS[actionName] || RATE_LIMITS.default;
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.perUser.window * 1000);

  // Extract IP address if request is provided
  const ipAddress = req ? extractIPAddress(req) : null;

  try {
    // Check both user and IP limits in parallel
    const [userLimitResult, ipLimitResult] = await Promise.allSettled([
      // Check user rate limit
      (async () => {
        const { data: recentRequests, error } = await supabaseClient
          .from('rate_limits')
          .select('created_at')
          .eq('user_id', userId)
          .eq('action', actionName)
          .gte('created_at', windowStart.toISOString());

        if (error) {
          await logger.warn(
            'User rate limit check error',
            { error: error.message, user_id: userId, action: actionName },
            { traceId: 'utility' },
          );
          // Fail-secure: apply conservative limits
          return {
            limit: 10,
            remaining: 10,
            reset: Math.ceil((now.getTime() + 60 * 1000) / 1000),
            degraded: true,
          };
        }

        const requestCount = recentRequests?.length || 0;
        const remaining = Math.max(0, config.perUser.requests - requestCount);
        const resetTime = Math.ceil(
          (windowStart.getTime() + config.perUser.window * 1000) / 1000,
        );

        if (requestCount >= config.perUser.requests) {
          const oldestRequest = recentRequests[recentRequests.length - 1];
          const oldestRequestTime = new Date(oldestRequest.created_at);
          const retryAfter = Math.ceil(
            (oldestRequestTime.getTime() +
              config.perUser.window * 1000 -
              now.getTime()) /
              1000,
          );
          throw new RateLimitError(
            `Rate limit exceeded. Maximum ${config.perUser.requests} requests per ${config.perUser.window} seconds. Please try again in ${retryAfter} seconds.`,
            retryAfter,
          );
        }

        // Record this request
        await supabaseClient.from('rate_limits').insert({
          user_id: userId,
          action: actionName,
          created_at: now.toISOString(),
        });

        return {
          limit: config.perUser.requests,
          remaining,
          reset: resetTime,
        };
      })(),
      // Check IP rate limit if IP is available
      ipAddress && req
        ? checkIPRateLimit(supabaseClient, ipAddress, actionName, config)
        : Promise.resolve({ limit: Infinity, remaining: Infinity, reset: 0 }),
    ]);

    // Check if either limit was exceeded
    if (
      userLimitResult.status === 'rejected' &&
      userLimitResult.reason instanceof RateLimitError
    ) {
      throw userLimitResult.reason;
    }
    if (
      ipLimitResult.status === 'rejected' &&
      ipLimitResult.reason instanceof RateLimitError
    ) {
      throw ipLimitResult.reason;
    }

    // Get the most restrictive limit
    const userLimit =
      userLimitResult.status === 'fulfilled'
        ? userLimitResult.value
        : { limit: 10, remaining: 10, reset: 0, degraded: true };
    const ipLimit =
      ipLimitResult.status === 'fulfilled'
        ? ipLimitResult.value
        : { limit: Infinity, remaining: Infinity, reset: 0 };

    return {
      limit: Math.min(userLimit.limit, ipLimit.limit),
      remaining: Math.min(userLimit.remaining, ipLimit.remaining),
      reset: Math.max(userLimit.reset, ipLimit.reset),
      degraded: (userLimit as { degraded?: boolean }).degraded || (ipLimit as { degraded?: boolean }).degraded || false,
    };
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    // Fail-secure on unexpected errors
    await logger.error(
      'Unexpected error in rate limit check',
      {
        error: error instanceof Error ? error.message : String(error),
        user_id: userId,
        action: actionName,
      },
      { traceId: 'utility' },
    );
    return {
      limit: 10,
      remaining: 10,
      reset: Math.ceil((now.getTime() + 60 * 1000) / 1000),
      degraded: true,
    };
  }
}

// Clean up old rate limit records (can be called periodically)
export async function cleanupOldRateLimits(
  supabaseClient: SupabaseClient,
  olderThanMinutes: number = 5,
): Promise<void> {
  const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  // Clean up both user and IP rate limits
  const [userResult, ipResult] = await Promise.allSettled([
    supabaseClient
      .from('rate_limits')
      .delete()
      .lt('created_at', cutoffTime.toISOString()),
    supabaseClient
      .from('ip_rate_limits')
      .delete()
      .lt('created_at', cutoffTime.toISOString()),
  ]);

  if (
    userResult.status === 'rejected' ||
    (userResult.status === 'fulfilled' && userResult.value.error)
  ) {
    const error =
      userResult.status === 'rejected'
        ? userResult.reason
        : userResult.value.error;
    await logger.warn(
      'Failed to cleanup old user rate limits',
      {
        error: error instanceof Error ? error.message : String(error),
        older_than_minutes: olderThanMinutes,
      },
      { traceId: 'utility' },
    );
  }
  if (
    ipResult.status === 'rejected' ||
    (ipResult.status === 'fulfilled' && ipResult.value.error)
  ) {
    const error =
      ipResult.status === 'rejected' ? ipResult.reason : ipResult.value.error;
    await logger.warn(
      'Failed to cleanup old IP rate limits',
      {
        error: error instanceof Error ? error.message : String(error),
        older_than_minutes: olderThanMinutes,
      },
      { traceId: 'utility' },
    );
  }

  if (
    userResult.status === 'fulfilled' &&
    !userResult.value.error &&
    ipResult.status === 'fulfilled' &&
    !ipResult.value.error
  ) {
    await logger.info(
      'Cleaned up rate limit records',
      { older_than_minutes: olderThanMinutes },
      { traceId: 'utility' },
    );
  }
}
