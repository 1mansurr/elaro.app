// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

async function handleCleanup(supabaseAdmin: SupabaseClient) {
  const traceContext = extractTraceContext(
    new Request('https://cron.internal'),
  );

  await logger.info('Starting old reminders cleanup', {}, traceContext);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  const { count, error } = await supabaseAdmin
    .from('reminders')
    .delete({ count: 'exact' })
    .eq('completed', true)
    .lt('created_at', cutoffDate.toISOString());

  if (error) throw handleDbError(error);

  const result = {
    deletedCount: count ?? 0,
    message: `Successfully deleted ${count ?? 0} reminders.`,
  };

  await logger.info(
    'Finished cleanup job',
    { deleted_count: count ?? 0 },
    traceContext,
  );

  return result;
}

serve(createScheduledHandler(handleCleanup, { requireSecret: true })); // Secret required for this destructive action.
