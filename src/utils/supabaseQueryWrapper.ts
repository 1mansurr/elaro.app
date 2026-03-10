/**
 * Supabase Query Wrapper with Circuit Breaker Protection
 *
 * Provides circuit breaker protection for all Supabase operations
 * to prevent cascading failures during service outages.
 */

import { CircuitBreaker } from '@/utils/circuitBreaker';
import { retryWithBackoff } from '@/utils/errorRecovery';
import type { PostgrestError } from '@supabase/supabase-js';

// Circuit breaker instance for Supabase operations
const supabaseCircuitBreaker = CircuitBreaker.getInstance('supabase', {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  successThreshold: 2,
});

/**
 * Execute a Supabase query with circuit breaker and retry protection
 */
export async function executeSupabaseQuery<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: {
    retryOnFailure?: boolean;
    maxRetries?: number;
    operationName?: string;
  } = {},
): Promise<T> {
  const {
    retryOnFailure = true,
    maxRetries = 3,
    operationName = 'supabase_query',
  } = options;

  // Wrap operation with retry logic if enabled
  const operationWithRetry = retryOnFailure
    ? async () => {
        const retryResult = await retryWithBackoff(operation, {
          maxRetries,
          baseDelay: 1000,
          retryCondition: error => {
            // Don't retry client errors (4xx)
            const err = error as { statusCode?: number; code?: string };
            if (
              err.statusCode &&
              err.statusCode >= 400 &&
              err.statusCode < 500
            ) {
              return false;
            }
            // Retry network errors and server errors (5xx)
            return true;
          },
        });

        if (!retryResult.success) {
          throw retryResult.error;
        }

        return retryResult.result;
      }
    : operation;

  // Execute with circuit breaker protection
  try {
    const result = await supabaseCircuitBreaker.execute(operationWithRetry);

    if (!result) {
      throw new Error(`${operationName} returned undefined`);
    }

    if (result.error) {
      throw result.error;
    }

    if (result.data === null) {
      throw new Error(`${operationName} returned null data`);
    }

    return result.data;
  } catch (error) {
    // Log circuit breaker state for debugging
    const circuitState = supabaseCircuitBreaker.getState();
    if (circuitState === 'open') {
      console.error(
        `🔴 Supabase circuit breaker is OPEN. Service temporarily unavailable.`,
      );
    }

    throw error;
  }
}

/**
 * Execute a Supabase mutation with circuit breaker protection
 */
export async function executeSupabaseMutation<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: {
    retryOnFailure?: boolean;
    maxRetries?: number;
    operationName?: string;
  } = {},
): Promise<T> {
  // Mutations typically don't retry (idempotency concerns)
  return executeSupabaseQuery(operation, {
    ...options,
    retryOnFailure: false, // Default to no retry for mutations
  });
}

/**
 * Execute a Supabase query that may return null (not an error)
 */
export async function executeSupabaseQueryNullable<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: {
    retryOnFailure?: boolean;
    maxRetries?: number;
    operationName?: string;
  } = {},
): Promise<T | null> {
  const {
    retryOnFailure = true,
    maxRetries = 3,
    operationName = 'supabase_query',
  } = options;

  // Wrap operation with retry logic if enabled
  const operationWithRetry = retryOnFailure
    ? async () => {
        const retryResult = await retryWithBackoff(operation, {
          maxRetries,
          baseDelay: 1000,
          retryCondition: error => {
            // Don't retry client errors (4xx)
            const err = error as { statusCode?: number; code?: string };
            if (
              err.statusCode &&
              err.statusCode >= 400 &&
              err.statusCode < 500
            ) {
              return false;
            }
            // Retry network errors and server errors (5xx)
            return true;
          },
        });

        if (!retryResult.success) {
          throw retryResult.error;
        }

        return retryResult.result;
      }
    : operation;

  // Execute with circuit breaker protection
  try {
    const result = await supabaseCircuitBreaker.execute(operationWithRetry);

    if (!result) {
      throw new Error(`${operationName} returned undefined`);
    }

    if (result.error) {
      throw result.error;
    }

    // Allow null data for nullable queries
    return result.data;
  } catch (error) {
    // Log circuit breaker state for debugging
    const circuitState = supabaseCircuitBreaker.getState();
    if (circuitState === 'open') {
      console.error(
        `🔴 Supabase circuit breaker is OPEN. Service temporarily unavailable.`,
      );
    }

    throw error;
  }
}

/**
 * Get circuit breaker statistics for monitoring
 */
export function getSupabaseCircuitBreakerStats() {
  return supabaseCircuitBreaker.getStats();
}

/**
 * Reset circuit breaker (for testing or manual recovery)
 */
export function resetSupabaseCircuitBreaker() {
  supabaseCircuitBreaker.reset();
}
