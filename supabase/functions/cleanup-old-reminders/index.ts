import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

async function handleCleanup(supabaseAdmin: SupabaseClient) {
  console.log('--- Starting Old Reminders Cleanup Job ---');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  const { count, error } = await supabaseAdmin
    .from('reminders')
    .delete({ count: 'exact' })
    .eq('completed', true)
    .lt('created_at', cutoffDate.toISOString());

  if (error) throw error;

  const result = { deletedCount: count ?? 0, message: `Successfully deleted ${count ?? 0} reminders.` };
  console.log('--- Finished Cleanup Job ---', result);
  return result;
}

serve(createScheduledHandler(handleCleanup, { requireSecret: true })); // Secret required for this destructive action.
