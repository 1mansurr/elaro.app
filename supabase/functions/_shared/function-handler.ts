import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { User } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { corsHeaders } from './cors.ts';
import { checkRateLimit, RateLimitError, RateLimitInfo } from './rate-limiter.ts';
import { checkTaskLimit } from './check-task-limit.ts';
import { createMetricsCollector } from './metrics.ts';
import { addVersionHeaders, validateApiVersion, getRequestedVersion } from './versioning.ts';
import { checkIdempotency, cacheIdempotency } from './idempotency.ts';

// Define custom, structured application errors
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Define the shape of an authenticated request
export interface AuthenticatedRequest extends Request {
  user: User;
  supabaseClient: SupabaseClient;
  body: any;
}

// Centralized error handler
function handleError(error: unknown): Response {
  console.error('--- Function Error ---', {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  // Base headers with versioning
  const baseHeaders = {
    ...corsHeaders,
    ...addVersionHeaders(),
    'Content-Type': 'application/json',
  };

  if (error instanceof AppError) {
    const response: any = { error: error.message, code: error.code };
    if (error.details) {
      response.details = error.details;
    }
    return new Response(JSON.stringify(response), {
      status: error.statusCode,
      headers: baseHeaders,
    });
  }
  
  if (error instanceof RateLimitError) {
    const response: any = { 
      error: 'Too Many Requests',
      message: error.message,
      code: 'RATE_LIMIT_EXCEEDED',
    };
    
    // Add Retry-After header if available
    const headers = { ...baseHeaders };
    if (error.retryAfter) {
      headers['Retry-After'] = error.retryAfter.toString();
    }
    
    return new Response(JSON.stringify(response), {
      status: 429,
      headers,
    });
  }

  // Generic fallback for unexpected errors
  return new Response(JSON.stringify({ 
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
  }), {
    status: 500,
    headers: baseHeaders,
  });
}

// The generic handler wrapper
export function createAuthenticatedHandler(
  handler: (req: AuthenticatedRequest) => Promise<Response | any>,
  options: { 
    rateLimitName: string; 
    checkTaskLimit?: boolean;
    schema?: z.ZodSchema;
  }
) {
  return async (req: Request): Promise<Response> => {
    // Create metrics collector
    const metrics = createMetricsCollector(options.rateLimitName);
    
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      // 0. Check API version
      const requestedVersion = getRequestedVersion(req);
      if (!validateApiVersion(requestedVersion)) {
        throw new AppError(`Unsupported API version: ${requestedVersion}`, 400, 'UNSUPPORTED_VERSION');
      }

      // 1. Authenticate user
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
      );
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      // 2. Check idempotency key (for POST/PUT/DELETE operations)
      const idempotencyKey = req.headers.get('Idempotency-Key');
      if (idempotencyKey && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')) {
        const idempotencyResult = await checkIdempotency(supabaseClient, user.id, idempotencyKey);
        if (idempotencyResult.cached) {
          console.log(`♻️ Returning cached response for idempotency key`);
          const responseHeaders = {
            ...corsHeaders,
            ...addVersionHeaders(),
            'X-Idempotency-Cached': 'true',
            'Content-Type': 'application/json',
          };
          return new Response(JSON.stringify(idempotencyResult.response), {
            headers: responseHeaders,
            status: 200,
          });
        }
      }

      // 3. Rate limit and capture limit info
      const rateLimitInfo = await checkRateLimit(supabaseClient, user.id, options.rateLimitName);

      // 4. Check task limit if enabled
      if (options.checkTaskLimit) {
        const limitError = await checkTaskLimit(supabaseClient, user.id);
        if (limitError) {
          return limitError;
        }
      }

      // 5. Parse body and validate with Zod schema if provided
      let body = await req.json();
      if (options.schema) {
        const validationResult = options.schema.safeParse(body);
        if (!validationResult.success) {
          throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', validationResult.error.flatten());
        }
        body = validationResult.data; // Use the parsed (and potentially transformed) data
      }

      // 6. Log structured request (for debugging and monitoring)
      console.log(JSON.stringify({
        type: 'request',
        function: options.rateLimitName,
        user_id: user.id,
        method: req.method,
        has_idempotency_key: !!idempotencyKey,
        api_version: requestedVersion,
        timestamp: new Date().toISOString(),
      }));

      // Execute the specific business logic
      const result = await handler({ ...req, user, supabaseClient, body });

      // 7. Cache response for idempotency if key was provided
      if (idempotencyKey && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')) {
        await cacheIdempotency(supabaseClient, user.id, idempotencyKey, result);
      }

      // 8. Record metrics for successful request
      metrics.incrementRequest();
      
      // Determine status code
      let statusCode = 200;
      if (result instanceof Response) {
        statusCode = result.status;
      }
      
      metrics.incrementStatusCode(statusCode);

      // Log structured response
      console.log(JSON.stringify({
        type: 'response',
        function: options.rateLimitName,
        user_id: user.id,
        status: statusCode,
        rate_limit_remaining: rateLimitInfo.remaining,
        timestamp: new Date().toISOString(),
      }));

      // 9. Return success response with rate limit and version headers
      const responseHeaders = {
        ...corsHeaders,
        ...addVersionHeaders(),
        'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
        'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
        'X-RateLimit-Reset': rateLimitInfo.reset.toString(),
        'Content-Type': 'application/json',
      };
      
      // If the handler already returned a Response object, use it. Otherwise, stringify the result.
      if (result instanceof Response) {
        return result;
      }
      return new Response(JSON.stringify(result), {
        headers: responseHeaders,
        status: 200,
      });

    } catch (error) {
      // 10. Record error metrics
      if (error instanceof AppError) {
        metrics.recordError('AppError', error.message);
        metrics.incrementStatusCode(error.statusCode);
      } else if (error instanceof RateLimitError) {
        metrics.recordError('RateLimitError', error.message);
      } else {
        metrics.recordError('UnknownError', 'Unknown error occurred');
      }

      // 9. Centralized error handling
      return handleError(error);
    } finally {
      // Ensure metrics are recorded even if there's an error
      metrics.recordExecutionTime();
    }
  };
}

// New handler for scheduled functions (cron jobs) that need admin access
export function createScheduledHandler(
  handler: (supabaseAdminClient: SupabaseClient) => Promise<Response | any>,
  options?: { requireSecret?: boolean; secretEnvVar?: string; }
) {
  return async (req: Request): Promise<Response> => {
    try {
      // Check for secret if this handler requires it
      if (options?.requireSecret) {
        const secret = Deno.env.get(options.secretEnvVar || 'CRON_SECRET');
        const authHeader = req.headers.get('Authorization');
        if (!secret || authHeader !== `Bearer ${secret}`) {
          throw new AppError('Unauthorized.', 401, 'CRON_AUTH_ERROR');
        }
      }

      // Create an admin client with the service role key to bypass RLS
      const supabaseAdminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Execute the specific business logic, passing in the admin client
      const result = await handler(supabaseAdminClient);

      // Return success response
      if (result instanceof Response) {
        return result;
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (error) {
      // Use the same centralized error handler
      return handleError(error);
    }
  };
}

// Constant-time string comparison to prevent timing attacks
async function constantTimeCompare(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) {
    return false;
  }
  
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  
  return result === 0;
}

// Webhook-specific handler for services that use Authorization header (e.g., RevenueCat)
export function createWebhookHandler(
  handler: (supabaseAdmin: SupabaseClient, payload: any, eventType: string) => Promise<Response | any>,
  options: { secretKeyEnvVar: string; headerName: string; }
) {
  return async (req: Request): Promise<Response> => {
    try {
      // Get the expected authorization header value from environment variables
      const expectedAuthHeader = Deno.env.get(options.secretKeyEnvVar);
      
      // Get the authorization header from the incoming request
      const receivedAuthHeader = req.headers.get(options.headerName);
      
      // Validate that both are present
      if (!expectedAuthHeader || !receivedAuthHeader) {
        console.error('❌ Webhook authentication failed: Missing authorization header or secret');
        throw new AppError('Webhook not configured correctly.', 500, 'WEBHOOK_CONFIG_ERROR');
      }

      // Securely compare the authorization headers using constant-time comparison
      // This prevents timing attacks
      const isValid = await constantTimeCompare(receivedAuthHeader, expectedAuthHeader);
      
      if (!isValid) {
        console.error('❌ Webhook authentication failed: Invalid authorization header');
        throw new AppError('Invalid webhook authorization.', 401, 'WEBHOOK_AUTH_ERROR');
      }

      console.log('✅ Webhook authorization verified successfully');

      // Parse the request body
      const requestBody = await req.text();
      const payload = JSON.parse(requestBody);
      const eventType = payload.event?.type || 'UNKNOWN';

      // Create Supabase admin client for database operations
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Call the main handler function with the parsed payload
      const result = await handler(supabaseAdmin, payload, eventType);

      // Return the result as JSON response
      if (result instanceof Response) return result;
      return new Response(JSON.stringify(result), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return handleError(error);
    }
  };
}
