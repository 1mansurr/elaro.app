import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Cleanup Used Nonces
 *
 * Scheduled function to remove expired nonces from the database.
 * Runs periodically to prevent table bloat and ensure efficient nonce lookups.
 *
 * SECURITY: This cleanup is critical for maintaining replay protection performance.
 * Without cleanup, the used_nonces table would grow unbounded, causing:
 * - Slower nonce lookups (full table scans)
 * - Increased storage costs
 * - Potential denial of service via table bloat
 */
async function handleCleanup(supabaseAdminClient: SupabaseClient) {
  const traceContext = extractTraceContext(
    new Request('https://cron.internal'),
  );

  await logger.info('Starting used nonces cleanup', {}, traceContext);

  try {
    const now = new Date().toISOString();

    // SECURITY: Delete expired nonces using indexed expires_at column
    // This query uses idx_used_nonces_expires_at for efficient deletion
    const { error, count } = await supabaseAdminClient
      .from('used_nonces')
      .delete()
      .lt('expires_at', now);

    if (error) {
      throw handleDbError(error);
    }

    await logger.info(
      'Cleaned up expired used nonces',
      {
        cleaned_count: count || 0,
      },
      traceContext,
    );

    return {
      success: true,
      message: `Cleaned up ${count || 0} expired used nonces`,
      cleaned_count: count || 0,
      timestamp: now,
    };
  } catch (error: unknown) {
    await logger.error(
      'Used nonces cleanup failed',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );
    throw error;
  }
}

serve(
  createScheduledHandler(handleCleanup, {
    requireSecret: true,
    secretEnvVar: 'CRON_SECRET',
  }),
);
