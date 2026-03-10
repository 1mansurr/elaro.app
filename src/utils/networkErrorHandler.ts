/**
 * Network Error Handler
 *
 * Provides utilities for handling network errors, offline scenarios, and connection issues.
 */

import { useNetwork } from '@/contexts/NetworkContext';
import { mapErrorCodeToMessage, isRecoverableError } from './errorMapping';
import { calculateRetryDelay, getRetryConfig } from './retryConfig';
import { networkMonitoring } from '@/services/networkMonitoring';
import { executeWithRecovery, RecoveryStrategy } from './errorRecovery';

export interface NetworkErrorOptions {
  showOfflineMessage?: boolean;
  retryOnReconnect?: boolean;
  maxRetries?: number;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  // Type guard to safely access error properties
  const errorObj = error as { message?: string; code?: string; name?: string };
  const errorString = JSON.stringify(error).toLowerCase();
  const message = (errorObj.message || '').toLowerCase();
  const code = (errorObj.code || '').toLowerCase();

  return (
    errorString.includes('network') ||
    errorString.includes('fetch') ||
    errorString.includes('timeout') ||
    errorString.includes('connection') ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    code === 'net_error' ||
    code === 'network_error' ||
    code === 'timeout' ||
    code === 'econnreset' ||
    code === 'enotfound' ||
    (error &&
      typeof error === 'object' &&
      'name' in error &&
      (error.name === 'NetworkError' || error.name === 'TimeoutError'))
  );
}

/**
 * Get network-specific error message
 */
export function getNetworkErrorMessage(
  error: unknown,
  isOffline: boolean = false,
): string {
  if (isOffline) {
    return 'You are currently offline. Please check your internet connection and try again.';
  }

  if (isNetworkError(error)) {
    const errorObj = error as { message?: string; code?: string };
    const message = mapErrorCodeToMessage(error);

    // Check for specific network error types
    const errorString = JSON.stringify(error).toLowerCase();

    if (errorString.includes('timeout')) {
      return 'The request timed out. Please check your connection and try again.';
    }

    if (errorString.includes('dns') || errorString.includes('enotfound')) {
      return 'Could not reach the server. Please check your internet connection.';
    }

    if (
      errorString.includes('econnreset') ||
      errorString.includes('connection reset')
    ) {
      return 'Connection was reset. Please try again.';
    }

    return (
      message ||
      'Network error. Please check your internet connection and try again.'
    );
  }

  return mapErrorCodeToMessage(error);
}

/**
 * Hook for handling network errors with automatic retry
 */
export function useNetworkErrorHandler() {
  const { isOnline, isOffline } = useNetwork();

  async function handleNetworkError<T>(
    operation: () => Promise<T>,
    options: NetworkErrorOptions = {},
  ): Promise<T> {
    const {
      showOfflineMessage = true,
      retryOnReconnect = true,
      maxRetries = 3,
    } = options;

    // Check if offline before attempting operation
    if (isOffline && showOfflineMessage) {
      throw new Error(
        'You are currently offline. Please check your internet connection.',
      );
    }

    let lastError: unknown;
    let attempts = 0;

    while (attempts < maxRetries) {
      attempts++;

      try {
        // Check online status before each attempt
        if (isOffline) {
          throw new Error('Device is offline');
        }

        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;

        // If it's not a network error, throw immediately
        if (!isNetworkError(error)) {
          throw error;
        }

        // If it's the last attempt, throw
        if (attempts >= maxRetries) {
          throw error;
        }

        // Wait before retry (exponential backoff with jitter)
        const retryConfig = getRetryConfig('normal');
        const delay = calculateRetryDelay(attempts - 1, retryConfig);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  return {
    handleNetworkError,
    isOnline,
    isOffline,
    isNetworkError,
    getNetworkErrorMessage: (error: unknown) =>
      getNetworkErrorMessage(error, isOffline),
  };
}

/**
 * Create a network-aware fetch wrapper
 */
export async function networkAwareFetch(
  url: string,
  options: RequestInit = {},
  isOnline: boolean = true,
): Promise<Response> {
  if (!isOnline) {
    throw new Error('Device is offline');
  }

  const startTime = performance.now();
  const requestSize = JSON.stringify(options.body || '').length;
  const requestId = networkMonitoring.trackRequest(
    url,
    options.method || 'GET',
    requestSize,
  );

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeout =
    (options as RequestInit & { timeout?: number }).timeout || 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Extract timeout from options to avoid passing it to fetch
  const { timeout: _, ...fetchOptions } = options as RequestInit & {
    timeout?: number;
  };

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const endTime = performance.now();
    const latency = endTime - startTime;

    // Get response size (approximate)
    let responseSize = 0;
    try {
      const clonedResponse = response.clone();
      const text = await clonedResponse.text();
      responseSize = text.length;
    } catch {
      // If we can't read the response, estimate based on headers
      const contentLength = response.headers.get('content-length');
      responseSize = contentLength ? parseInt(contentLength, 10) : 0;
    }

    networkMonitoring.trackResponse(
      requestId,
      url,
      response.status,
      responseSize,
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error: unknown) {
    if (error instanceof Error) {
      networkMonitoring.trackError(requestId, url, error);

      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new Error('Request timed out. Please try again.');
      }
    }
    throw error;
  }
}

/**
 * Check if device can reach the internet
 */
export async function checkInternetConnectivity(): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch with recovery strategy: primary → retry with shorter timeout → cached data
 *
 * @example
 * ```typescript
 * const response = await fetchWithRecovery(
 *   'https://api.example.com/data',
 *   { method: 'GET' },
 *   async () => {
 *     // Return cached response if available
 *     const cached = await AsyncStorage.getItem('cached-response');
 *     return cached ? JSON.parse(cached) : null;
 *   }
 * );
 * ```
 */
export async function fetchWithRecovery(
  url: string,
  options: RequestInit = {},
  getCachedResponse?: () => Promise<Response | null>,
): Promise<Response> {
  const strategy: RecoveryStrategy<Response> = {
    primary: async () => {
      return await networkAwareFetch(url, options, true);
    },
    fallbacks: [
      // Fallback 1: Retry with shorter timeout
      async () => {
        const shorterTimeoutOptions = {
          ...options,
          timeout: 5000, // 5 seconds instead of default 30
        };
        return await networkAwareFetch(url, shorterTimeoutOptions, true);
      },
      // Fallback 2: Return cached response if available
      async () => {
        if (getCachedResponse) {
          const cached = await getCachedResponse();
          if (cached) {
            console.log('✅ Using cached response');
            return cached;
          }
        }
        throw new Error('No cached response available');
      },
    ],
    shouldRetry: error => isNetworkError(error),
    onFailure: (error, attempt) => {
      console.warn(`⚠️ Fetch attempt ${attempt} failed:`, error.message);
    },
  };

  return executeWithRecovery(strategy);
}
