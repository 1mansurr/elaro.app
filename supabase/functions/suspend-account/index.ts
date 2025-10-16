import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const SuspendAccountSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(1),
  duration: z.number().optional(), // Duration in days, null for indefinite
  adminNotes: z.string().optional(),
});

async function handleSuspendAccount({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { userId, reason, duration, adminNotes } = body;
  
  // SECURITY: Only admins can suspend accounts
  const { data: adminUser, error: adminError } = await supabaseClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (adminError || adminUser?.role !== 'admin') {
    throw new AppError('Unauthorized: Admin access required', 403, 'ADMIN_REQUIRED');
  }
  
  // Prevent admins from suspending themselves
  if (userId === user.id) {
    throw new AppError('Cannot suspend your own account', 400, 'SELF_SUSPENSION_NOT_ALLOWED');
  }
  
  // Check if target user exists and is not already suspended
  const { data: targetUser, error: targetError } = await supabaseClient
    .from('users')
    .select('id, email, account_status')
    .eq('id', userId)
    .single();
    
  if (targetError) throw new AppError('Target user not found', 404, 'USER_NOT_FOUND');
  
  if (targetUser.account_status === 'suspended') {
    throw new AppError('Account is already suspended', 400, 'ALREADY_SUSPENDED');
  }
  
  if (targetUser.account_status === 'deleted') {
    throw new AppError('Cannot suspend a deleted account', 400, 'CANNOT_SUSPEND_DELETED');
  }
  
  console.log(`Admin ${user.id} suspending account ${userId} (${targetUser.email})`);
  
  const now = new Date().toISOString();
  const suspensionData: any = {
    account_status: 'suspended',
    updated_at: now,
  };
  
  // Set suspension end date if duration is specified
  if (duration && duration > 0) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);
    suspensionData.suspension_end_date = endDate.toISOString();
  }
  
  const { data, error: updateError } = await supabaseClient
    .from('users')
    .update(suspensionData)
    .eq('id', userId)
    .select()
    .single();

  if (updateError) throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
  
  // Log the suspension action
  const { error: logError } = await supabaseClient
    .from('admin_actions')
    .insert({
      admin_id: user.id,
      target_user_id: userId,
      action: 'suspend_account',
      reason,
      admin_notes: adminNotes,
      metadata: { 
        duration, 
        suspension_end_date: suspensionData.suspension_end_date,
        target_user_email: targetUser.email
      }
    });
    
  if (logError) {
    console.error('Error logging admin action:', logError);
    // Don't throw here as the main operation succeeded
  }
  
  // Sign out the suspended user from all sessions
  const { error: signOutError } = await supabaseClient.auth.signOut({ scope: 'global' });
  if (signOutError) {
    console.error('Error signing out suspended user:', signOutError);
    // Don't throw here as the main operation succeeded
  }
  
  console.log(`Successfully suspended account ${userId}`);
  return { 
    message: 'Account suspended successfully',
    user: data,
    suspensionDetails: {
      duration: duration || 'indefinite',
      endDate: suspensionData.suspension_end_date || null
    }
  };
}

serve(createAuthenticatedHandler(
  handleSuspendAccount,
  { 
    rateLimitName: 'suspend-account',
    schema: SuspendAccountSchema
  }
));
