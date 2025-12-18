import { getFreshAccessToken } from './getFreshAccessToken';
import { FunctionsInvokeOptions } from '@supabase/supabase-js';

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
        const errorData = JSON.parse(responseText);
        error = {
          message:
            errorData.message || `Edge Function returned a non-2xx status code`,
          context: {
            status: response.status,
            statusText: response.statusText,
            ...errorData,
          },
        };
      } catch {
        error = {
          message: `Edge Function returned a non-2xx status code`,
          context: {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
          },
        };
      }
    } else {
      // Parse success response
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        // If response is not JSON, return as text
        data = responseText as any;
      }
    }

    return { data, error };
  } catch (error) {
    // If token refresh fails or request fails, return error
    console.error(`❌ Failed to invoke ${functionName}:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
