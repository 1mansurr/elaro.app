/**
 * Retry Logic Utilities
 *
 * Provides exponential backoff retry logic for transient failures
 * in external API calls or database operations.
 */

/**
 * Sleep for a specified duration
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  const err = error as { statusCode?: number; code?: string };

  // Don't retry client errors (4xx except 429)
  if (
    err.statusCode &&
    err.statusCode >= 400 &&
    err.statusCode < 500 &&
    err.statusCode !== 429
  ) {
    return false;
  }

  // Don't retry authentication errors
  if (err.statusCode === 401 || err.statusCode === 403) {
    return false;
  }

  // Don't retry validation errors
  if (err.code === 'VALIDATION_ERROR') {
    return false;
  }

  // Retry server errors, timeouts, network errors, and rate limits
  return true;
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @param maxDelay - Maximum delay in milliseconds (default: 30000)
 * @returns Promise with the result of the function
 *
 * @example
 * ```typescript
 * const data = await retryWithBackoff(async () => {
 *   return await fetch('https://api.external.com/data');
 * });
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();

      // Success! Log if it was a retry
      if (attempt > 0) {
        console.log(`✅ Retry successful on attempt ${attempt + 1}`);
      }

      return result;
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxRetries - 1;
      const err = error as { message?: string };

      // Check if error is retryable
      if (!isRetryableError(error)) {
        console.log(
          `❌ Non-retryable error encountered: ${err.message || 'Unknown error'}`,
        );
        throw error;
      }

      if (isLastAttempt) {
        console.log(`❌ Max retries (${maxRetries}) exceeded`);
        throw error;
      }

      // Calculate delay with exponential backoff
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(2, attempt),
        maxDelay,
      );

      // Add jitter (randomize delay by ±25% to prevent thundering herd)
      const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
      const delayWithJitter = Math.floor(exponentialDelay + jitter);

      console.log(
        `⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delayWithJitter}ms (error: ${err.message || 'Unknown error'})`,
      );
      await delay(delayWithJitter);
    }
  }

  throw lastError;
}

/**
 * Retry specifically for fetch requests with timeout
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum retry attempts
 * @param timeout - Request timeout in milliseconds
 * @returns Promise with fetch response
 */
export function retryFetch(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  timeout: number = 10000,
): Promise<Response> {
  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is ok
      if (!response.ok && response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      const err = error as { name?: string };

      if (err.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }, maxRetries);
}
