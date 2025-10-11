import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// This is a public function, so we don't use our authenticated handler.
// It needs its own Supabase client using environment variables.
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

interface ServiceStatus {
  service: string;
  status: 'ok' | 'error';
  message?: string;
  responseTime?: number;
}

interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  services: ServiceStatus[];
  version: string;
  environment: string;
}

/**
 * Performs a lightweight health check on the Supabase database.
 * Uses a simple query to verify database connectivity and RLS policies.
 */
async function checkSupabase(client: SupabaseClient): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    // Perform a lightweight query to test database connectivity
    // This query is safe because it only selects from a public table
    // and doesn't expose any sensitive data
    const { error } = await client
      .from('courses')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return { 
        service: 'supabase', 
        status: 'error', 
        message: `Database query failed: ${error.message}`,
        responseTime
      };
    }
    
    return { 
      service: 'supabase', 
      status: 'ok', 
      message: 'Database connection and RLS policies working',
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return { 
      service: 'supabase', 
      status: 'error', 
      message: `Database connection failed: ${error.message}`,
      responseTime
    };
  }
}

/**
 * Performs a health check on the Paystack API.
 * Uses the balance endpoint which is lightweight and confirms API key validity.
 */
async function checkPaystack(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
    
    if (!PAYSTACK_SECRET_KEY) {
      return { 
        service: 'paystack', 
        status: 'error', 
        message: 'Paystack secret key not configured',
        responseTime: Date.now() - startTime
      };
    }

    // Use the balance endpoint as it's lightweight and confirms API key validity
    const response = await fetch('https://api.paystack.co/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      // Set a timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return { 
        service: 'paystack', 
        status: 'error', 
        message: `Paystack API returned status: ${response.status} ${response.statusText}`,
        responseTime
      };
    }
    
    const data = await response.json();
    
    // Check if the API response indicates success
    if (data.status !== true) {
      return { 
        service: 'paystack', 
        status: 'error', 
        message: `Paystack API returned error: ${data.message || 'Unknown error'}`,
        responseTime
      };
    }

    return { 
      service: 'paystack', 
      status: 'ok', 
      message: 'API key valid and service responsive',
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Handle specific error types
    if (error.name === 'TimeoutError') {
      return { 
        service: 'paystack', 
        status: 'error', 
        message: 'Request timeout - Paystack service may be slow or unavailable',
        responseTime
      };
    }
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { 
        service: 'paystack', 
        status: 'error', 
        message: 'Network error - Unable to reach Paystack API',
        responseTime
      };
    }
    
    return { 
      service: 'paystack', 
      status: 'error', 
      message: `Paystack check failed: ${error.message}`,
      responseTime
    };
  }
}

/**
 * Performs a health check on the Expo Push Notification service.
 * This is a lightweight check to verify the service is accessible.
 */
async function checkExpoPushService(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    // Make a simple request to the Expo push service to verify it's accessible
    // We don't need to send an actual notification, just check connectivity
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]', // Dummy token for testing
        title: 'Health Check',
        body: 'Test',
      }),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const responseTime = Date.now() - startTime;

    // Even if the request fails due to invalid token, if we get a response
    // it means the service is accessible
    if (response.status === 400 && response.headers.get('content-type')?.includes('application/json')) {
      return { 
        service: 'expo-push', 
        status: 'ok', 
        message: 'Expo Push service is accessible',
        responseTime
      };
    }

    return { 
      service: 'expo-push', 
      status: 'error', 
      message: `Expo Push service returned unexpected status: ${response.status}`,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (error.name === 'TimeoutError') {
      return { 
        service: 'expo-push', 
        status: 'error', 
        message: 'Request timeout - Expo Push service may be slow or unavailable',
        responseTime
      };
    }
    
    return { 
      service: 'expo-push', 
      status: 'error', 
      message: `Expo Push service check failed: ${error.message}`,
      responseTime
    };
  }
}

/**
 * Main health check handler that orchestrates all service checks.
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('--- Health Check Function Invoked ---');
  const overallStartTime = Date.now();

  try {
    // Define all health checks to perform
    const checks = [
      checkSupabase(supabase),
      checkPaystack(),
      checkExpoPushService(),
    ];

    // Execute all checks concurrently
    // Promise.allSettled ensures that if one check fails, others still complete
    const results = await Promise.allSettled(checks);

    // Process results and extract service statuses
    const serviceStatuses = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // This case should ideally not happen if our check functions always resolve
        const serviceNames = ['supabase', 'paystack', 'expo-push'];
        return { 
          service: serviceNames[index] || 'unknown', 
          status: 'error', 
          message: 'Health check function failed unexpectedly'
        };
      }
    });

    // Determine overall system status
    const overallStatus = serviceStatuses.every(s => s.status === 'ok') ? 'ok' : 'error';
    const overallResponseTime = Date.now() - overallStartTime;

    // Build comprehensive response
    const responsePayload: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: serviceStatuses,
      version: '1.0.0',
      environment: Deno.env.get('ENVIRONMENT') || 'development',
    };

    // Log results for monitoring
    console.log('--- Health Check Results ---', {
      ...responsePayload,
      overallResponseTime: `${overallResponseTime}ms`
    });

    // Always return 200 status so monitoring services can parse the JSON body
    // The actual health status is indicated in the response body
    return new Response(JSON.stringify(responsePayload, null, 2), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${overallResponseTime}ms`
      },
      status: 200,
    });

  } catch (error) {
    console.error('--- Health Check Function Error ---', error);
    
    // Return error response that still follows our API format
    const errorResponse: HealthCheckResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      services: [{
        service: 'health-check',
        status: 'error',
        message: `Health check function failed: ${error.message}`
      }],
      version: '1.0.0',
      environment: Deno.env.get('ENVIRONMENT') || 'development',
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json'
      },
      status: 200, // Still return 200 so monitoring can parse the error details
    });
  }
});
