/**
 * Client-Side Rate Limiter
 *
 * Prevents excessive API calls from the client by limiting request frequency
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitState {
  requestTimes: number[];
  lastCleanup: number;
}

class ClientRateLimiter {
  private requests: Map<string, RateLimitState> = new Map();
  private cleanupInterval: number = 60000; // Clean up every minute

  constructor() {
    // Periodic cleanup to prevent memory leaks
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), this.cleanupInterval);
    }
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(key: string, config: RateLimitConfig): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get or create state for this key
    if (!this.requests.has(key)) {
      this.requests.set(key, {
        requestTimes: [],
        lastCleanup: now,
      });
    }

    const state = this.requests.get(key)!;

    // Remove old requests outside window
    state.requestTimes = state.requestTimes.filter(time => time > windowStart);

    if (state.requestTimes.length >= config.maxRequests) {
      return false; // Rate limit exceeded
    }

    // Record this request
    state.requestTimes.push(now);

    return true; // Within limit
  }

  /**
   * Get retry-after time in seconds
   */
  getRetryAfter(key: string, config: RateLimitConfig): number {
    const state = this.requests.get(key);
    if (!state || state.requestTimes.length === 0) {
      return 0;
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;
    const recentRequests = state.requestTimes.filter(
      time => time > windowStart,
    );

    if (recentRequests.length === 0) {
      return 0;
    }

    // Find oldest request in window
    const oldestRequest = Math.min(...recentRequests);
    const windowEnd = oldestRequest + config.windowMs;
    const retryAfter = Math.max(0, Math.ceil((windowEnd - now) / 1000));

    return retryAfter;
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [key, state] of this.requests.entries()) {
      // Remove entries older than maxAge
      if (now - state.lastCleanup > maxAge && state.requestTimes.length === 0) {
        this.requests.delete(key);
      } else {
        // Clean up old request times
        state.requestTimes = state.requestTimes.filter(
          time => now - time < maxAge,
        );
        state.lastCleanup = now;
      }
    }
  }

  /**
   * Clear rate limit for a specific key
   */
  clear(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.requests.clear();
  }

  /**
   * Get current state for debugging
   */
  getState(
    key: string,
  ): { count: number; oldestRequest: number | null } | null {
    const state = this.requests.get(key);
    if (!state) {
      return null;
    }

    const now = Date.now();
    const recentRequests = state.requestTimes.filter(
      time => now - time < 60000, // Last minute
    );

    return {
      count: recentRequests.length,
      oldestRequest:
        recentRequests.length > 0 ? Math.min(...recentRequests) : null,
    };
  }
}

// Singleton instance
export const clientRateLimiter = new ClientRateLimiter();

// Pre-configured limits for different operation types
export const CLIENT_RATE_LIMITS = {
  supabase_query: { maxRequests: 60, windowMs: 60000 }, // 60 requests/minute
  supabase_mutation: { maxRequests: 30, windowMs: 60000 }, // 30 mutations/minute
  revenuecat_api: { maxRequests: 20, windowMs: 60000 }, // 20 requests/minute
  general: { maxRequests: 100, windowMs: 60000 }, // 100 requests/minute default
} as const;

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number = 0,
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Execute a function with client-side rate limiting
 * Returns the result directly (not wrapped in RetryResult)
 */
export async function withRateLimit<T>(
  key: string,
  config: RateLimitConfig,
  fn: () => Promise<T>,
): Promise<T> {
  const canProceed = await clientRateLimiter.checkLimit(key, config);

  if (!canProceed) {
    const retryAfter = clientRateLimiter.getRetryAfter(key, config);
    throw new RateLimitError(
      `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMs / 1000} seconds. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    );
  }

  return await fn();
}
