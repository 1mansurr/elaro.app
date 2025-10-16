import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function handlePermanentDeletion(supabaseAdminClient: any) {
  console.log('Starting permanent account deletion process...');
  
  // Find all accounts that should be permanently deleted (7+ days old)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);
  
  const { data: accountsToDelete, error: fetchError } = await supabaseAdminClient
    .from('users')
    .select('id, email')
    .eq('account_status', 'deleted')
    .not('deletion_scheduled_at', 'is', null)
    .lt('deletion_scheduled_at', cutoffDate.toISOString());

  if (fetchError) throw fetchError;
  
  console.log(`Found ${accountsToDelete.length} accounts to permanently delete`);
  
  let deletedCount = 0;
  const errors: string[] = [];
  
  for (const account of accountsToDelete) {
    try {
      console.log(`Permanently deleting account: ${account.email} (${account.id})`);
      
      // Delete all user data (same as current deleteUserAccount function)
      await supabaseAdminClient
        .from('spaced_repetition_reminders')
        .delete()
        .eq('user_id', account.id);
      
      await supabaseAdminClient.from('user_events').delete().eq('user_id', account.id);
      await supabaseAdminClient.from('study_sessions').delete().eq('user_id', account.id);
      await supabaseAdminClient.from('streaks').delete().eq('user_id', account.id);
      await supabaseAdminClient.from('subscriptions').delete().eq('user_id', account.id);
      
      // Delete from courses, assignments, lectures (these have soft delete, so we need to permanently delete them too)
      await supabaseAdminClient.from('courses').delete().eq('user_id', account.id);
      await supabaseAdminClient.from('assignments').delete().eq('user_id', account.id);
      await supabaseAdminClient.from('lectures').delete().eq('user_id', account.id);
      
      // Delete from users table
      await supabaseAdminClient.from('users').delete().eq('id', account.id);

      // Delete auth user
      const { error: authDeleteError } = await supabaseAdminClient.auth.admin.deleteUser(account.id);
      if (authDeleteError) {
        console.error(`Error deleting auth user ${account.id}:`, authDeleteError);
        errors.push(`Auth deletion failed for ${account.email}: ${authDeleteError.message}`);
      }
      
      deletedCount++;
      console.log(`Successfully permanently deleted account: ${account.email}`);
    } catch (error) {
      const errorMsg = `Error permanently deleting account ${account.id}: ${error.message}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }
  
  const result = { 
    message: 'Permanent deletion process completed',
    deletedCount,
    totalFound: accountsToDelete.length,
    errors: errors.length > 0 ? errors : undefined
  };
  
  console.log('Permanent deletion process completed:', result);
  return result;
}

serve(createScheduledHandler(handlePermanentDeletion, { 
  requireSecret: true, 
  secretEnvVar: 'CRON_SECRET' 
}));
