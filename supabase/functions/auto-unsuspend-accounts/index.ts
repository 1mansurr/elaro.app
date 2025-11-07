import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function handleAutoUnsuspend(supabaseAdminClient: SupabaseClient) {
  const traceContext = extractTraceContext(
    new Request('https://cron.internal'),
  );

  await logger.info('Starting auto-unsuspend process', {}, traceContext);

  const now = new Date().toISOString();

  // Find all suspended accounts where suspension has expired
  const { data: expiredSuspensions, error: fetchError } =
    await supabaseAdminClient
      .from('users')
      .select('id, email, suspension_end_date')
      .eq('account_status', 'suspended')
      .not('suspension_end_date', 'is', null)
      .lt('suspension_end_date', now);

  if (fetchError) throw handleDbError(fetchError);

  await logger.info(
    'Found expired suspensions',
    { count: expiredSuspensions?.length || 0 },
    traceContext,
  );

  let unsuspendedCount = 0;
  const errors: string[] = [];

  for (const account of expiredSuspensions || []) {
    try {
      await logger.info(
        'Auto-unsuspending account',
        { account_id: account.id, email: account.email },
        traceContext,
      );

      // Update account status to active
      const { error: updateError } = await supabaseAdminClient
        .from('users')
        .update({
          account_status: 'active',
          suspension_end_date: null,
          updated_at: now,
        })
        .eq('id', account.id);

      if (updateError) throw handleDbError(updateError);

      // Log the auto-unsuspension action
      const { error: logError } = await supabaseAdminClient
        .from('admin_actions')
        .insert({
          admin_id: account.id, // Use the system as the admin for auto-actions
          target_user_id: account.id,
          action: 'auto_unsuspend_account',
          reason: 'Automatic unsuspension - suspension period expired',
          admin_notes: 'System-generated action',
          metadata: {
            target_user_email: account.email,
            previous_suspension_end_date: account.suspension_end_date,
            auto_unsuspend: true,
          },
        });

      if (logError) {
        await logger.error(
          'Error logging auto-unsuspension',
          { account_id: account.id, error: logError.message },
          traceContext,
        );
        // Don't throw here as the main operation succeeded
      }

      unsuspendedCount++;
      await logger.info(
        'Successfully auto-unsuspended account',
        { account_id: account.id },
        traceContext,
      );
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error(
        'Error auto-unsuspending account',
        { account_id: account.id, error: errorMsg },
        traceContext,
      );
      errors.push(errorMsg);
    }
  }

  const result = {
    message: 'Auto-unsuspend process completed',
    unsuspendedCount,
    totalFound: expiredSuspensions?.length || 0,
    errors: errors.length > 0 ? errors : undefined,
  };

  await logger.info(
    'Auto-unsuspend process completed',
    {
      unsuspended_count: unsuspendedCount,
      total_found: expiredSuspensions?.length || 0,
      error_count: errors.length,
    },
    traceContext,
  );
  return result;
}

serve(
  createScheduledHandler(handleAutoUnsuspend, {
    requireSecret: true,
    secretEnvVar: 'CRON_SECRET',
  }),
);
