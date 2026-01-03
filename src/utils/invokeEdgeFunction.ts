import { getFreshAccessToken } from './getFreshAccessToken';
import { FunctionsInvokeOptions } from '@supabase/supabase-js';
import { parseJsonSafely } from './safeJsonParser';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Invokes a Supabase Edge Function with automatic fresh token authentication.
 *
 * This wrapper ensures we always send a valid, non-expired access token to edge functions,
 * preventing "Auth session missing!" errors that occur when using cached/stale tokens.
 *
 * Uses fetch directly instead of supabase.functions.invoke() to ensure our fresh token
 * is used and not overridden by the Supabase client's session token.
 *
 * @param functionName - The name of the edge function to invoke
 * @param options - Options for the edge function call (body, signal, etc.)
 * @returns Promise with the edge function response
 *
 * @example
 * ```typescript
 * const { data, error } = await invokeEdgeFunctionWithAuth('create-assignment', {
 *   body: { title: 'My Assignment' },
 *   signal: abortController.signal,
 * });
 * ```
 */
export async function invokeEdgeFunctionWithAuth<T = any>(
  functionName: string,
  options: Omit<FunctionsInvokeOptions, 'headers'> & {
    headers?: Record<string, string>;
  } = {},
): Promise<{ data: T | null; error: any }> {
  try {
    // Get fresh access token to ensure it's valid and not expired
    const accessToken = await getFreshAccessToken();

    // Build the function URL
    const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

    // Prepare headers with fresh token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      ...options.headers,
    };

    // Make the request using fetch directly to ensure our fresh token is used
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    // Parse response
    const responseText = await response.text();
    let data: T | null = null;
    let error: any = null;

    if (!response.ok) {
      // Try to parse error response
      try {
        // FIX: Use safe JSON parser to prevent crashes from empty/undefined responses
        const errorData = parseJsonSafely(responseText, response.url, response.status);
        if (errorData) {
          error = {
            message:
              errorData.message ||
              `Edge Function returned a non-2xx status code`,
            context: {
              status: response.status,
              statusText: response.statusText,
              ...errorData,
            },
          };
        } else {
          // No valid JSON body, create error from status
          error = {
            message: `Edge Function returned a non-2xx status code`,
            context: {
              status: response.status,
              statusText: response.statusText,
              body: responseText || null,
            },
          };
        }
      } catch (parseError) {
        // If parsing fails, create error from status
        error = {
          message: parseError instanceof Error 
            ? parseError.message 
            : `Edge Function returned a non-2xx status code`,
          context: {
            status: response.status,
            statusText: response.statusText,
            body: responseText || null,
          },
        };
      }
    } else {
      // Parse success response
      try {
        // FIX: Use safe JSON parser to prevent crashes from empty/undefined responses
        data = parseJsonSafely<T>(responseText, response.url, response.status);
      } catch (parseError) {
        // If response is not JSON, return null
        console.warn(
          `Failed to parse Edge Function response from ${response.url}:`,
          parseError instanceof Error ? parseError.message : String(parseError),
        );
        data = null;
      }
    }

    return { data, error };
  } catch (error) {
    // If token refresh fails or request fails, return error
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Only log errors in development to reduce production noise
    // Edge function deployment issues are expected during development
    if (__DEV__) {
      console.error(`❌ Failed to invoke ${functionName}:`, error);
    }
    
    // Create a user-friendly error message
    let friendlyError: Error;
    if (errorMessage.includes('Function failed to start') || 
        errorMessage.includes('please check logs')) {
      friendlyError = new Error('Function failed to start (please check logs)');
    } else {
      friendlyError = error instanceof Error ? error : new Error(errorMessage);
    }
    
    return {
      data: null,
      error: friendlyError,
    };
  }
}
