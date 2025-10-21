import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

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
  key: string
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
      console.error('Error checking idempotency:', error);
      return { cached: false };
    }

    if (data) {
      console.log(`♻️ Idempotency key hit: ${key.substring(0, 8)}...`);
      return { cached: true, response: data.response };
    }

    return { cached: false };
  } catch (error) {
    console.error('Unexpected error in idempotency check:', error);
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
  response: unknown
): Promise<void> {
  try {
    const { error } = await supabaseClient
      .from('idempotency_keys')
      .insert({
        key,
        user_id: userId,
        response,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      });

    if (error) {
      console.error('Failed to cache idempotency key:', error);
      // Don't throw - this is non-critical
    } else {
      console.log(`💾 Cached idempotency key: ${key.substring(0, 8)}...`);
    }
  } catch (error) {
    console.error('Unexpected error caching idempotency:', error);
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

