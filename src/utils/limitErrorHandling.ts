/**
 * Error handling utilities for limit checking
 */

export interface LimitError {
  message: string;
  code?: string;
  retryable: boolean;
}

/**
 * Check if an error is retryable (network errors, timeouts, etc.)
 */
export function isRetryableLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorMessage = error.message.toLowerCase();
  const retryablePatterns = [
    'network',
    'timeout',
    'connection',
    'fetch',
    'failed to fetch',
    'network request failed',
  ];

  return retryablePatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Format error message for display
 */
export function formatLimitError(error: unknown): LimitError {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as any).code,
      retryable: isRetryableLimitError(error),
    };
  }

  return {
    message: 'An unexpected error occurred',
    retryable: false,
  };
}

/**
 * Create a retryable error handler
 */
export function createRetryHandler(
  maxRetries: number = 2,
  onRetry: () => Promise<void>,
) {
  let retryCount = 0;

  return async () => {
    if (retryCount >= maxRetries) {
      throw new Error('Maximum retry attempts reached');
    }

    retryCount++;
    await onRetry();
  };
}

