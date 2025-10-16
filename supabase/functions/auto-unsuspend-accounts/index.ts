import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function handleAutoUnsuspend(supabaseAdminClient: any) {
  console.log('Starting auto-unsuspend process for expired suspensions...');
  
  const now = new Date().toISOString();
  
  // Find all suspended accounts where suspension has expired
  const { data: expiredSuspensions, error: fetchError } = await supabaseAdminClient
    .from('users')
    .select('id, email, suspension_end_date')
    .eq('account_status', 'suspended')
    .not('suspension_end_date', 'is', null)
    .lt('suspension_end_date', now);

  if (fetchError) throw fetchError;
  
  console.log(`Found ${expiredSuspensions.length} accounts with expired suspensions`);
  
  let unsuspendedCount = 0;
  const errors: string[] = [];
  
  for (const account of expiredSuspensions) {
    try {
      console.log(`Auto-unsuspending account: ${account.email} (${account.id})`);
      
      // Update account status to active
      const { error: updateError } = await supabaseAdminClient
        .from('users')
        .update({
          account_status: 'active',
          suspension_end_date: null,
          updated_at: now,
        })
        .eq('id', account.id);
        
      if (updateError) throw updateError;
      
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
            auto_unsuspend: true
          }
        });
        
      if (logError) {
        console.error(`Error logging auto-unsuspension for ${account.id}:`, logError);
        // Don't throw here as the main operation succeeded
      }
      
      unsuspendedCount++;
      console.log(`Successfully auto-unsuspended account: ${account.email}`);
    } catch (error) {
      const errorMsg = `Error auto-unsuspending account ${account.id}: ${error.message}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }
  
  const result = { 
    message: 'Auto-unsuspend process completed',
    unsuspendedCount,
    totalFound: expiredSuspensions.length,
    errors: errors.length > 0 ? errors : undefined
  };
  
  console.log('Auto-unsuspend process completed:', result);
  return result;
}

serve(createScheduledHandler(handleAutoUnsuspend, { 
  requireSecret: true, 
  secretEnvVar: 'CRON_SECRET' 
}));
