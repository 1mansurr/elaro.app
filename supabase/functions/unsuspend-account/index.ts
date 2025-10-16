import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const UnsuspendAccountSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(1),
  adminNotes: z.string().optional(),
});

async function handleUnsuspendAccount({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { userId, reason, adminNotes } = body;
  
  // SECURITY: Only admins can unsuspend accounts
  const { data: adminUser, error: adminError } = await supabaseClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (adminError || adminUser?.role !== 'admin') {
    throw new AppError('Unauthorized: Admin access required', 403, 'ADMIN_REQUIRED');
  }
  
  // Check if target user exists and is suspended
  const { data: targetUser, error: targetError } = await supabaseClient
    .from('users')
    .select('id, email, account_status, suspension_end_date')
    .eq('id', userId)
    .single();
    
  if (targetError) throw new AppError('Target user not found', 404, 'USER_NOT_FOUND');
  
  if (targetUser.account_status !== 'suspended') {
    throw new AppError('Account is not suspended', 400, 'NOT_SUSPENDED');
  }
  
  console.log(`Admin ${user.id} unsuspending account ${userId} (${targetUser.email})`);
  
  const now = new Date().toISOString();
  const { data, error: updateError } = await supabaseClient
    .from('users')
    .update({
      account_status: 'active',
      suspension_end_date: null,
      updated_at: now,
    })
    .eq('id', userId)
    .select()
    .single();

  if (updateError) throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
  
  // Log the unsuspension action
  const { error: logError } = await supabaseClient
    .from('admin_actions')
    .insert({
      admin_id: user.id,
      target_user_id: userId,
      action: 'unsuspend_account',
      reason,
      admin_notes: adminNotes,
      metadata: { 
        target_user_email: targetUser.email,
        previous_suspension_end_date: targetUser.suspension_end_date
      }
    });
    
  if (logError) {
    console.error('Error logging admin action:', logError);
    // Don't throw here as the main operation succeeded
  }
  
  console.log(`Successfully unsuspended account ${userId}`);
  return { 
    message: 'Account unsuspended successfully',
    user: data
  };
}

serve(createAuthenticatedHandler(
  handleUnsuspendAccount,
  { 
    rateLimitName: 'unsuspend-account',
    schema: UnsuspendAccountSchema
  }
));
