import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const SoftDeleteAccountSchema = z.object({
  reason: z.string().optional(),
});

async function handleSoftDeleteAccount({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { reason } = body;
  
  console.log(`Soft deleting account for user: ${user.id}`);
  
  // Check if account is already deleted
  const { data: currentUser, error: fetchError } = await supabaseClient
    .from('users')
    .select('account_status')
    .eq('id', user.id)
    .single();

  if (fetchError) throw new AppError(fetchError.message, 500, 'DB_FETCH_ERROR');
  
  if (currentUser.account_status === 'deleted') {
    throw new AppError('Account is already deleted', 400, 'ALREADY_DELETED');
  }
  
  if (currentUser.account_status === 'suspended') {
    throw new AppError('Cannot delete a suspended account', 400, 'SUSPENDED_ACCOUNT');
  }
  
  const now = new Date().toISOString();
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 7); // 7 days from now
  
  // Update user account status to 'deleted' and set deletion timestamp
  const { data, error: updateError } = await supabaseClient
    .from('users')
    .update({
      account_status: 'deleted',
      deleted_at: now,
      deletion_scheduled_at: deletionDate.toISOString(),
      updated_at: now,
    })
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
  
  // Sign out the user from all sessions
  const { error: signOutError } = await supabaseClient.auth.signOut({ scope: 'global' });
  if (signOutError) {
    console.error('Error signing out user:', signOutError);
    // Don't throw here as the main operation succeeded
  }
  
  console.log(`Successfully soft deleted account for user: ${user.id}`);
  return { 
    message: 'Account deletion initiated. You have 7 days to restore your account.',
    deletionDate: deletionDate.toISOString(),
    reason: reason || 'User requested account deletion'
  };
}

serve(createAuthenticatedHandler(
  handleSoftDeleteAccount,
  { 
    rateLimitName: 'soft-delete-account',
    schema: SoftDeleteAccountSchema
  }
));
