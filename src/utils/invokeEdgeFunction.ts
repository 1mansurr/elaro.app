import { getFreshAccessToken } from './getFreshAccessToken';
import { parseJsonSafely } from './safeJsonParser';
import Constants from 'expo-constants';

// API URL and anon key from environment variables
const apiUrl =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL;
const apiAnonKey =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

interface EdgeFunctionOptions {
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  method?: string;
}

/**
 * Invokes a remote Edge Function with automatic fresh token authentication.
 */
export async function invokeEdgeFunctionWithAuth<T = any>(
  functionName: string,
  options: EdgeFunctionOptions = {},
): Promise<{ data: T | null; error: any }> {
  try {
    const accessToken = await getFreshAccessToken();

    const functionUrl = `${apiUrl}/functions/v1/${functionName}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: apiAnonKey,
      ...options.headers,
    };

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    const responseText = await response.text();
    let data: T | null = null;
    let error: any = null;

    if (!response.ok) {
      try {
        const errorData = parseJsonSafely(
          responseText,
          response.url,
          response.status,
        );
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
        error = {
          message:
            parseError instanceof Error
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
      try {
        data = parseJsonSafely<T>(responseText, response.url, response.status);
      } catch (parseError) {
        console.warn(
          `Failed to parse Edge Function response from ${response.url}:`,
          parseError instanceof Error ? parseError.message : String(parseError),
        );
        data = null;
      }
    }

    return { data, error };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (__DEV__) {
      console.error(`❌ Failed to invoke ${functionName}:`, error);
    }

    let friendlyError: Error;
    if (
      errorMessage.includes('Function failed to start') ||
      errorMessage.includes('please check logs')
    ) {
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
