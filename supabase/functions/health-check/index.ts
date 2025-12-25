import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Check notification system health
 */
async function checkNotificationHealth(
  supabaseClient: ReturnType<typeof createClient>,
): Promise<{
  status: 'ok' | 'error';
  expoPush: 'ok' | 'error';
  queue: 'ok' | 'error';
}> {
  try {
    // Check Expo Push API
    const expoResponse = await fetch(
      'https://exp.host/--/api/v2/push/getReceipts',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [] }),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      },
    );

    const expoStatus = expoResponse.ok ? 'ok' : 'error';

    // Check notification queue (if table exists)
    let queueStatus: 'ok' | 'error' = 'ok';
    try {
      const { error: queueError } = await supabaseClient
        .from('notification_queue')
        .select('id')
        .limit(1);

      queueStatus = !queueError ? 'ok' : 'error';
    } catch {
      // Table might not exist, that's ok - just mark as error
      queueStatus = 'error';
    }

    return {
      status: expoStatus === 'ok' && queueStatus === 'ok' ? 'ok' : 'error',
      expoPush: expoStatus,
      queue: queueStatus,
    };
  } catch (_error) {
    return {
      status: 'error',
      expoPush: 'error',
      queue: 'error',
    };
  }
}

interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  checks?: {
    api: 'ok' | 'error';
    database: 'ok' | 'error';
    notifications?: {
      status: 'ok' | 'error';
      expoPush: 'ok' | 'error';
      queue: 'ok' | 'error';
    };
  };
  message?: string;
  version?: string;
}

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const checks: HealthCheckResponse['checks'] = {
    api: 'ok',
    database: 'error',
  };

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );

  try {
    // Check 1: API Liveness
    // If we reach this point, the Edge Function is running
    checks.api = 'ok';

    // Check 2: Database Connectivity
    try {
      // Perform a simple, fast read-only query
      // Remove .single() to allow empty results - we just need to verify DB is accessible
      const { error } = await supabaseClient
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        // PGRST116 = "not found" (empty table) - database is working, just no data
        // 42501 = "insufficient privilege" (RLS blocking) - database is working, RLS is active
        // PGRST301 = "permission denied" (RLS) - database is working, RLS is active
        // These errors indicate the database is accessible and functioning
        if (
          error.code === 'PGRST116' ||
          error.code === '42501' ||
          error.code === 'PGRST301'
        ) {
          // Database is accessible - these are expected scenarios
          checks.database = 'ok';
        } else {
          // Other errors indicate real database connectivity issues
          throw error;
        }
      } else {
        // Query succeeded - database is accessible
        checks.database = 'ok';
      }
    } catch (dbError) {
      // Health check doesn't need full logger - just check database
      checks.database = 'error';

      // Return 503 Service Unavailable
      const response: HealthCheckResponse = {
        status: 'error',
        timestamp,
        checks,
        message: `Database connection failed: ${
          dbError instanceof Error ? dbError.message : 'Unknown error'
        }`,
      };

      return new Response(JSON.stringify(response), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check 3: Notification Health
    const notificationHealth = await checkNotificationHealth(supabaseClient);
    checks.notifications = notificationHealth;

    // Determine overall status
    const overallStatus =
      checks.database === 'ok' && checks.notifications?.status === 'ok'
        ? 'ok'
        : 'error';

    const responseTime = Date.now() - startTime;
    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp,
      checks,
      version: '1.0.0',
    };

    // Add response time header
    const headers = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Response-Time': `${responseTime}ms`,
    };

    return new Response(JSON.stringify(response), {
      status: overallStatus === 'ok' ? 200 : 503,
      headers,
    });
  } catch (error) {
    // Health check errors are expected - no logging needed

    const response: HealthCheckResponse = {
      status: 'error',
      timestamp,
      checks,
      message: error instanceof Error ? error.message : 'Unknown error',
    };

    return new Response(JSON.stringify(response), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
