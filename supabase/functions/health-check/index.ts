import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { corsHeaders } from '../_shared/cors.ts';

interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  checks?: {
    api: 'ok' | 'error';
    database: 'ok' | 'error';
  };
  message?: string;
  version?: string;
}

serve(async (req) => {
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

  try {
    // Check 1: API Liveness
    // If we reach this point, the Edge Function is running
    checks.api = 'ok';

    // Check 2: Database Connectivity
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );

      // Perform a simple, fast read-only query
      const { error } = await supabaseClient
        .from('users')
        .select('id')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" which is expected when table is empty
        // Any other error indicates a real problem
        throw error;
      }

      checks.database = 'ok';
    } catch (dbError) {
      console.error('Database health check failed:', dbError);
      checks.database = 'error';
      
      // Return 503 Service Unavailable
      const response: HealthCheckResponse = {
        status: 'error',
        timestamp,
        checks,
        message: 'Database connection failed',
      };

      return new Response(JSON.stringify(response), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Both checks passed
    const responseTime = Date.now() - startTime;
    const response: HealthCheckResponse = {
      status: 'ok',
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
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Health check error:', error);
    
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
