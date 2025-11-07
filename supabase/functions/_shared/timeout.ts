/**
 * Timeout Utility for Edge Functions
 *
 * Provides timeout functionality for async operations to prevent indefinite hangs.
 */

/**
 * Execute a promise with a timeout
 *
 * @param promise - The promise to execute
 * @param timeoutMs - Timeout duration in milliseconds
 * @param errorMessage - Custom error message for timeout
 * @returns Promise that resolves with the result or rejects with timeout error
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
    ),
  ]);
}

/**
 * Default timeout values for different operations
 */
export const DEFAULT_TIMEOUTS = {
  expoPush: 15000, // 15 seconds for Expo push notifications
  revenuecat: 10000, // 10 seconds for RevenueCat API
  supabase: 15000, // 15 seconds for Supabase operations
  general: 10000, // 10 seconds for general operations
} as const;
