// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function handlePermanentDeletion(supabaseAdminClient: SupabaseClient) {
  const traceContext = extractTraceContext(
    new Request('https://cron.internal'),
  );

  await logger.info(
    'Starting permanent account deletion process',
    {},
    traceContext,
  );

  // Find all accounts that should be permanently deleted (7+ days old)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  const { data: accountsToDelete, error: fetchError } =
    await supabaseAdminClient
      .from('users')
      .select('id, email')
      .eq('account_status', 'deleted')
      .not('deletion_scheduled_at', 'is', null)
      .lt('deletion_scheduled_at', cutoffDate.toISOString());

  if (fetchError) throw handleDbError(fetchError);

  await logger.info(
    'Found accounts to permanently delete',
    { count: accountsToDelete?.length || 0 },
    traceContext,
  );

  let deletedCount = 0;
  const errors: string[] = [];

  for (const account of accountsToDelete || []) {
    try {
      await logger.info(
        'Permanently deleting account',
        { account_id: account.id, email: account.email },
        traceContext,
      );

      // Delete all user data (same as current deleteUserAccount function)
      await supabaseAdminClient
        .from('spaced_repetition_reminders')
        .delete()
        .eq('user_id', account.id);

      await supabaseAdminClient
        .from('user_events')
        .delete()
        .eq('user_id', account.id);
      await supabaseAdminClient
        .from('study_sessions')
        .delete()
        .eq('user_id', account.id);
      await supabaseAdminClient
        .from('streaks')
        .delete()
        .eq('user_id', account.id);
      await supabaseAdminClient
        .from('subscriptions')
        .delete()
        .eq('user_id', account.id);

      // Delete from courses, assignments, lectures (these have soft delete, so we need to permanently delete them too)
      await supabaseAdminClient
        .from('courses')
        .delete()
        .eq('user_id', account.id);
      await supabaseAdminClient
        .from('assignments')
        .delete()
        .eq('user_id', account.id);
      await supabaseAdminClient
        .from('lectures')
        .delete()
        .eq('user_id', account.id);

      // Delete from users table
      await supabaseAdminClient.from('users').delete().eq('id', account.id);

      // Delete auth user
      const { error: authDeleteError } =
        await supabaseAdminClient.auth.admin.deleteUser(account.id);
      if (authDeleteError) {
        const errorMsg = `Auth deletion failed for ${account.email}: ${authDeleteError.message}`;
        await logger.error(
          'Error deleting auth user',
          {
            account_id: account.id,
            error: authDeleteError.message,
          },
          traceContext,
        );
        errors.push(errorMsg);
      }

      deletedCount++;
      await logger.info(
        'Successfully permanently deleted account',
        { account_id: account.id },
        traceContext,
      );
    } catch (error: unknown) {
      const errorMsg = `Error permanently deleting account ${account.id}: ${error instanceof Error ? error.message : String(error)}`;
      await logger.error(
        'Error permanently deleting account',
        {
          account_id: account.id,
          error: errorMsg,
        },
        traceContext,
      );
      errors.push(errorMsg);
    }
  }

  const result = {
    message: 'Permanent deletion process completed',
    deletedCount,
    totalFound: accountsToDelete?.length || 0,
    errors: errors.length > 0 ? errors : undefined,
  };

  await logger.info(
    'Permanent deletion process completed',
    {
      deleted_count: deletedCount,
      total_found: accountsToDelete?.length || 0,
      error_count: errors.length,
    },
    traceContext,
  );

  return result;
}

serve(
  createScheduledHandler(handlePermanentDeletion, {
    requireSecret: true,
    secretEnvVar: 'CRON_SECRET',
  }),
);
