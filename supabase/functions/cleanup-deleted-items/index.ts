// This is a Supabase Edge Function designed to be run on a schedule (cron job).
// To schedule this function to run once daily, use the following command with the Supabase CLI:
// supabase functions deploy cleanup-deleted-items --schedule "0 0 * * *"
//
// This function will:
// 1. Fetch all users.
// 2. For each user, check their subscription tier.
// 3. Permanently delete soft-deleted items older than the defined retention period.
//    - Free users: 48 hours
//    - Premium users: 120 hours

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RETENTION_PERIOD_FREE_HOURS = 48;
const RETENTION_PERIOD_PREMIUM_HOURS = 120;
const TABLES_TO_CLEAN = [
  'courses',
  'assignments',
  'lectures',
  'study_sessions',
];

async function handleCleanupDeletedItems(supabaseAdmin: SupabaseClient) {
  const traceContext = extractTraceContext(
    new Request('https://cron.internal'),
  );

  await logger.info('Starting cleanup of deleted items', {}, traceContext);

  // 1. Fetch all users with their subscription tier
  const { data: users, error: usersError } = await supabaseAdmin
    .from('users')
    .select('id, subscription_tier');

  if (usersError) throw handleDbError(usersError);

  await logger.info(
    'Found users to process',
    { user_count: users?.length || 0 },
    traceContext,
  );

  let totalDeleted = 0;
  const errors: string[] = [];

  // 2. Process each user individually
  for (const user of users || []) {
    try {
      const isPremium = user.subscription_tier !== 'free';
      const retentionHours = isPremium
        ? RETENTION_PERIOD_PREMIUM_HOURS
        : RETENTION_PERIOD_FREE_HOURS;

      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - retentionHours);
      const cutoffTimestamp = cutoffDate.toISOString();

      await logger.info(
        'Processing user cleanup',
        {
          user_id: user.id,
          is_premium: isPremium,
          cutoff_timestamp: cutoffTimestamp,
        },
        traceContext,
      );

      // 3. For each user, iterate through tables and delete old items
      for (const table of TABLES_TO_CLEAN) {
        const { error: deleteError } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('user_id', user.id)
          .not('deleted_at', 'is', null) // Ensure we only touch soft-deleted items
          .lt('deleted_at', cutoffTimestamp); // The core retention logic

        if (deleteError) {
          const errorMsg = `Error cleaning table ${table} for user ${user.id}: ${deleteError.message}`;
          await logger.error(
            'Error during table cleanup',
            {
              user_id: user.id,
              table,
              error: deleteError.message,
            },
            traceContext,
          );
          errors.push(errorMsg);
          // Continue to next table/user even if one fails
        }
      }

      totalDeleted++;
    } catch (error: unknown) {
      const errorMsg = `Error processing user ${user.id}: ${error instanceof Error ? error.message : String(error)}`;
      await logger.error(
        'Error processing user cleanup',
        {
          user_id: user.id,
          error: errorMsg,
        },
        traceContext,
      );
      errors.push(errorMsg);
    }
  }

  await logger.info(
    'Cleanup process completed',
    {
      users_processed: totalDeleted,
      error_count: errors.length,
    },
    traceContext,
  );

  return {
    message: 'Cleanup process completed successfully.',
    usersProcessed: totalDeleted,
    errors: errors.length > 0 ? errors : undefined,
  };
}

serve(
  createScheduledHandler(handleCleanupDeletedItems, {
    requireSecret: true,
    secretEnvVar: 'CRON_SECRET',
  }),
);
