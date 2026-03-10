// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Cleanup Idempotency Keys
 *
 * Scheduled function to remove expired idempotency keys from the database.
 * Runs periodically to prevent table bloat.
 *
 * This is a maintenance task that keeps the idempotency_keys table clean.
 */
async function handleCleanup(supabaseAdminClient: SupabaseClient) {
  const traceContext = extractTraceContext(
    new Request('https://cron.internal'),
  );

  await logger.info('Starting idempotency keys cleanup', {}, traceContext);

  try {
    const now = new Date().toISOString();

    // Delete expired idempotency keys
    const { error, count } = await supabaseAdminClient
      .from('idempotency_keys')
      .delete()
      .lt('expires_at', now);

    if (error) {
      throw handleDbError(error);
    }

    await logger.info(
      'Cleaned up expired idempotency keys',
      {
        cleaned_count: count || 0,
      },
      traceContext,
    );

    return {
      success: true,
      message: `Cleaned up ${count || 0} expired idempotency keys`,
      cleaned_count: count || 0,
      timestamp: now,
    };
  } catch (error: unknown) {
    await logger.error(
      'Idempotency cleanup failed',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );
    throw error;
  }
}

serve(createScheduledHandler(handleCleanup));
