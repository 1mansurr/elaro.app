/**
 * Error Recovery Utilities
 *
 * Provides utilities for error recovery, retry logic, and fallback strategies.
 */

import { isRecoverableError } from './errorMapping';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryCondition?: (error: unknown) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: unknown;
  attempts: number;
}

/**
 * Recovery strategy with primary and multiple fallback options
 */
export interface RecoveryStrategy<T> {
  primary: () => Promise<T>;
  fallbacks: Array<() => Promise<T>>;
  onFailure?: (error: Error, attempt: number) => void;
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Retry a function with exponential backoff
 *
 * @example
 * const result = await retryWithBackoff(
 *   async () => await fetchData(),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    retryCondition = error => isRecoverableError(error),
  } = options;

  let lastError: unknown;
  let attempts = 0;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    attempts = attempt + 1;

    try {
      const result = await fn();

      if (attempt > 0) {
        console.log(`✅ Retry successful on attempt ${attempts}`);
      }

      return {
        success: true,
        result,
        attempts,
      };
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxRetries - 1;

      // Check if error is retryable
      if (!retryCondition(error)) {
        console.log(`❌ Non-retryable error:`, error);
        return {
          success: false,
          error,
          attempts,
        };
      }

      if (isLastAttempt) {
        console.log(`❌ Max retries (${maxRetries}) exceeded`);
        return {
          success: false,
          error,
          attempts,
        };
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(2, attempt),
        maxDelay,
      );
      const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
      const delay = Math.floor(exponentialDelay + jitter);

      console.log(
        `⏳ Retry attempt ${attempts}/${maxRetries} after ${delay}ms`,
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError,
    attempts,
  };
}

/**
 * Execute a function with automatic recovery
 * Tries primary function, falls back to secondary if it fails
 */
export async function executeWithFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  shouldFallback: (error: unknown) => boolean = () => true,
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (shouldFallback(error)) {
      console.log('⚠️ Primary operation failed, using fallback');
      try {
        return await fallback();
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        throw error; // Throw original error
      }
    }
    throw error;
  }
}

/**
 * Execute operation with multiple fallback strategies
 * Tries primary, then falls back through strategies in order
 *
 * @example
 * ```typescript
 * const result = await executeWithRecovery({
 *   primary: async () => await fetchFromAPI(),
 *   fallbacks: [
 *     async () => await getCachedData(),
 *     async () => await getDefaultData(),
 *   ],
 *   onFailure: (error, attempt) => console.error(`Attempt ${attempt} failed:`, error),
 * });
 * ```
 */
export async function executeWithRecovery<T>(
  strategy: RecoveryStrategy<T>,
): Promise<T> {
  const { primary, fallbacks, onFailure, shouldRetry = () => true } = strategy;
  let lastError: Error | null = null;
  let attempt = 0;

  // Try primary operation
  try {
    attempt = 0;
    const result = await primary();
    return result;
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));
    onFailure?.(lastError, attempt);

    if (!shouldRetry(error)) {
      throw error;
    }
  }

  // Try fallbacks in order
  for (let i = 0; i < fallbacks.length; i++) {
    attempt = i + 1;
    try {
      console.log(`🔄 Attempting fallback ${attempt}/${fallbacks.length}`);
      const result = await fallbacks[i]();
      console.log(`✅ Fallback ${attempt} succeeded`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      onFailure?.(lastError, attempt);

      // If this is the last fallback, throw the error
      if (i === fallbacks.length - 1) {
        console.error(`❌ All fallbacks exhausted`);
        throw lastError;
      }
    }
  }

  // Should never reach here, but TypeScript requires it
  throw lastError || new Error('Recovery strategy failed');
}

/**
 * @deprecated CircuitBreaker class has been moved to @/utils/circuitBreaker.
 *
 * This file now only contains error recovery utilities.
 * Use CircuitBreaker.getInstance() from @/utils/circuitBreaker instead.
 *
 * Migration example:
 * ```typescript
 * // Old:
 * import { createCircuitBreaker } from '@/utils/errorRecovery';
 * const breaker = createCircuitBreaker(5, 60000);
 *
 * // New:
 * import { CircuitBreaker } from '@/utils/circuitBreaker';
 * const breaker = CircuitBreaker.getInstance('endpoint-name', {
 *   failureThreshold: 5,
 *   resetTimeout: 60000,
 * });
 * ```
 */

// Re-export for backward compatibility (if needed)
export { CircuitBreaker } from '@/utils/circuitBreaker';

/**
 * Debounce async function execution
 */
export function debounceAsync<
  T extends (...args: unknown[]) => Promise<unknown>,
>(fn: T, delay: number = 300): T {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<ReturnType<T>> | null = null;

  return ((...args: Parameters<T>) => {
    return new Promise<ReturnType<T>>((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        timeoutId = null;
        try {
          const result = await fn(...args);
          resolve(result as ReturnType<T>);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }) as T;
}

/**
 * Timeout wrapper for async functions
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 30000,
  timeoutMessage: string = 'Operation timed out',
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs),
    ),
  ]);
}

/**
 * Execute function with timeout and retry
 */
export async function executeWithTimeoutAndRetry<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 30000,
  retryOptions: RetryOptions = {},
): Promise<RetryResult<T>> {
  return retryWithBackoff(() => withTimeout(fn, timeoutMs), retryOptions);
}
