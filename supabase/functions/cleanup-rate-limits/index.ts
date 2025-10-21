import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { cleanupOldRateLimits } from '../_shared/rate-limiter.ts';

serve(createScheduledHandler(
  async (supabaseAdminClient) => {
    console.log('Starting rate limits cleanup...');
    
    // Clean up rate limit records older than 5 minutes
    await cleanupOldRateLimits(supabaseAdminClient, 5);
    
    console.log('Rate limits cleanup completed successfully');
    
    return { 
      success: true, 
      message: 'Rate limits cleaned up successfully',
      timestamp: new Date().toISOString()
    };
  },
  { requireSecret: true, secretEnvVar: 'CRON_SECRET' }
));

