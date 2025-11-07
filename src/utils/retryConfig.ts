/**
 * Retry Configuration Utilities
 *
 * Provides configurable retry policies with exponential backoff and jitter
 * to prevent thundering herd problems and improve resilience.
 */

export type RetryOperationType = 'critical' | 'normal' | 'background';

export interface RetryConfig {
  retry: number;
  maxDelay: number;
  baseDelay: number;
  jitter: number; // Jitter percentage (0-1)
}

/**
 * Get retry configuration based on operation type
 */
export function getRetryConfig(operationType: RetryOperationType): RetryConfig {
  switch (operationType) {
    case 'critical':
      return {
        retry: 5,
        maxDelay: 60000, // 60 seconds
        baseDelay: 1000, // 1 second
        jitter: 0.2, // ±20% jitter
      };
    case 'normal':
      return {
        retry: 3,
        maxDelay: 30000, // 30 seconds
        baseDelay: 1000, // 1 second
        jitter: 0.2, // ±20% jitter
      };
    case 'background':
      return {
        retry: 1,
        maxDelay: 10000, // 10 seconds
        baseDelay: 1000, // 1 second
        jitter: 0.1, // ±10% jitter
      };
  }
}

/**
 * Calculate retry delay with exponential backoff and jitter
 *
 * @param attemptIndex - Zero-based attempt index (0 = first retry)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 *
 * @example
 * ```typescript
 * const config = getRetryConfig('normal');
 * const delay = calculateRetryDelay(0, config); // First retry: ~1-1.2 seconds
 * const delay2 = calculateRetryDelay(1, config); // Second retry: ~2-2.4 seconds
 * ```
 */
export function calculateRetryDelay(
  attemptIndex: number,
  config: RetryConfig,
): number {
  // Exponential backoff: baseDelay * 2^attemptIndex
  const baseDelay = config.baseDelay * Math.pow(2, attemptIndex);

  // Add jitter (±jitter%): prevents thundering herd
  const jitterAmount = baseDelay * config.jitter * (Math.random() * 2 - 1);

  // Calculate final delay with jitter
  const delay = baseDelay + jitterAmount;

  // Clamp to max delay
  return Math.min(Math.max(delay, config.baseDelay), config.maxDelay);
}

/**
 * Create a retry delay function for React Query
 *
 * @param operationType - Type of operation to determine retry strategy
 * @returns Function that React Query can use for retryDelay
 *
 * @example
 * ```typescript
 * const queryClient = new QueryClient({
 *   defaultOptions: {
 *     queries: {
 *       retryDelay: createRetryDelayFunction('normal'),
 *     },
 *   },
 * });
 * ```
 */
export function createRetryDelayFunction(
  operationType: RetryOperationType = 'normal',
) {
  const config = getRetryConfig(operationType);

  return (attemptIndex: number) => {
    return calculateRetryDelay(attemptIndex, config);
  };
}
