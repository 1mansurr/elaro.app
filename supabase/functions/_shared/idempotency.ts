// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { logger } from './logging.ts';

/**
 * Idempotency Key Management
 *
 * Prevents duplicate operations by caching responses for a period of time.
 * Clients can send an Idempotency-Key header to ensure operations are not duplicated.
 */

export interface IdempotencyResult {
  cached: boolean;
  response?: unknown;
}

/**
 * Check if an idempotency key has been used before
 *
 * @param supabaseClient - Supabase client
 * @param userId - User ID (for RLS)
 * @param key - Idempotency key from request header
 * @returns Object indicating if cached response exists
 */
export async function checkIdempotency(
  supabaseClient: SupabaseClient,
  userId: string,
  key: string,
): Promise<IdempotencyResult> {
  try {
    const { data, error } = await supabaseClient
      .from('idempotency_keys')
      .select('response')
      .eq('key', key)
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      // If not found, that's fine - not an error condition
      if (error.code === 'PGRST116') {
        return { cached: false };
      }
      // Log other errors but don't block
      await logger.warn(
        'Error checking idempotency',
        { error: error.message, error_code: error.code },
        { traceId: 'utility' },
      );
      return { cached: false };
    }

    if (data) {
      await logger.debug(
        'Idempotency key cache hit',
        { key_prefix: key.substring(0, 8) },
        { traceId: 'utility' },
      );
      return { cached: true, response: data.response };
    }

    return { cached: false };
  } catch (error: unknown) {
    await logger.error(
      'Unexpected error in idempotency check',
      { error: error instanceof Error ? error.message : String(error) },
      { traceId: 'utility' },
    );
    return { cached: false };
  }
}

/**
 * Cache a response for an idempotency key
 *
 * @param supabaseClient - Supabase client
 * @param userId - User ID
 * @param key - Idempotency key
 * @param response - Response to cache
 */
export async function cacheIdempotency(
  supabaseClient: SupabaseClient,
  userId: string,
  key: string,
  response: unknown,
): Promise<void> {
  try {
    const { error } = await supabaseClient.from('idempotency_keys').insert({
      key,
      user_id: userId,
      response,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });

    if (error) {
      await logger.warn(
        'Failed to cache idempotency key',
        { error: error.message, user_id: userId },
        { traceId: 'utility' },
      );
      // Don't throw - this is non-critical
    } else {
      await logger.debug(
        'Cached idempotency key',
        { key_prefix: key.substring(0, 8), user_id: userId },
        { traceId: 'utility' },
      );
    }
  } catch (error: unknown) {
    await logger.error(
      'Unexpected error caching idempotency',
      {
        error: error instanceof Error ? error.message : String(error),
        user_id: userId,
      },
      { traceId: 'utility' },
    );
    // Don't throw - this is non-critical
  }
}

/**
 * Generate an idempotency key (for client-side use)
 * This is just a utility function for documentation purposes
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}
