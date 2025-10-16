import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';

async function handleRestoreAccount({ user, supabaseClient }: AuthenticatedRequest) {
  console.log(`Attempting to restore account for user: ${user.id}`);
  
  // Check if user account is in deleted status
  const { data: userData, error: fetchError } = await supabaseClient
    .from('users')
    .select('account_status, deletion_scheduled_at')
    .eq('id', user.id)
    .single();

  if (fetchError) throw new AppError(fetchError.message, 500, 'DB_FETCH_ERROR');
  
  if (userData.account_status !== 'deleted') {
    throw new AppError('Account is not in deleted status', 400, 'INVALID_STATUS');
  }
  
  // Check if 7 days have passed
  if (userData.deletion_scheduled_at) {
    const deletionDate = new Date(userData.deletion_scheduled_at);
    const now = new Date();
    
    if (now > deletionDate) {
      throw new AppError('Account restoration period has expired', 400, 'RESTORATION_EXPIRED');
    }
  }
  
  // Restore the account
  const now = new Date().toISOString();
  const { data, error: updateError } = await supabaseClient
    .from('users')
    .update({
      account_status: 'active',
      deleted_at: null,
      deletion_scheduled_at: null,
      updated_at: now,
    })
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
  
  console.log(`Successfully restored account for user: ${user.id}`);
  return { 
    message: 'Account restored successfully',
    user: data
  };
}

serve(createAuthenticatedHandler(
  handleRestoreAccount,
  { rateLimitName: 'restore-account' }
));
