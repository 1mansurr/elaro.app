import { supabase } from '@/services/supabase';
import { getFreshAccessToken } from './getFreshAccessToken';
import { FunctionsInvokeOptions } from '@supabase/supabase-js';

/**
 * Invokes a Supabase Edge Function with automatic fresh token authentication.
 * 
 * This wrapper ensures we always send a valid, non-expired access token to edge functions,
 * preventing "Auth session missing!" errors that occur when using cached/stale tokens.
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

    // Merge headers, ensuring Authorization header is set
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    };

    // Invoke the edge function with fresh token
    const result = await supabase.functions.invoke(functionName, {
      ...options,
      headers,
    });

    return result;
  } catch (error) {
    // If token refresh fails, return error
    console.error(`❌ Failed to invoke ${functionName}:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

