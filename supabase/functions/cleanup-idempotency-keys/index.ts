import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';

/**
 * Cleanup Idempotency Keys
 * 
 * Scheduled function to remove expired idempotency keys from the database.
 * Runs periodically to prevent table bloat.
 * 
 * This is a maintenance task that keeps the idempotency_keys table clean.
 */
async function handleCleanup(supabaseAdminClient: any) {
  console.log('🧹 Starting idempotency keys cleanup...');
  
  try {
    const now = new Date().toISOString();
    
    // Delete expired idempotency keys
    const { error, count } = await supabaseAdminClient
      .from('idempotency_keys')
      .delete()
      .lt('expires_at', now);

    if (error) {
      console.error('❌ Error during idempotency cleanup:', error);
      throw error;
    }

    console.log(`✅ Cleaned up ${count || 0} expired idempotency keys`);
    
    return {
      success: true,
      message: `Cleaned up ${count || 0} expired idempotency keys`,
      cleaned_count: count || 0,
      timestamp: now,
    };
  } catch (error) {
    console.error('❌ Idempotency cleanup failed:', error);
    throw error;
  }
}

serve(createScheduledHandler(handleCleanup));

