import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { User } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { corsHeaders } from './cors.ts';
import { checkRateLimit, RateLimitError } from './rate-limiter.ts';
import { checkTaskLimit } from './check-task-limit.ts';

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

  if (error instanceof AppError) {
    const response: any = { error: error.message, code: error.code };
    if (error.details) {
      response.details = error.details;
    }
    return new Response(JSON.stringify(response), {
      status: error.statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  if (error instanceof RateLimitError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Generic fallback for unexpected errors
  return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
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

      // 2. Rate limit
      await checkRateLimit(supabaseClient, user.id, options.rateLimitName);

      // 3. Check task limit if enabled
      if (options.checkTaskLimit) {
        const limitError = await checkTaskLimit(supabaseClient, user.id);
        if (limitError) {
          return limitError;
        }
      }

      // 4. Parse body and validate with Zod schema if provided
      let body = await req.json();
      if (options.schema) {
        const validationResult = options.schema.safeParse(body);
        if (!validationResult.success) {
          throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', validationResult.error.flatten());
        }
        body = validationResult.data; // Use the parsed (and potentially transformed) data
      }

      // 5. Execute the specific business logic
      const result = await handler({ ...req, user, supabaseClient, body });

      // 6. Return success response
      // If the handler already returned a Response object, use it. Otherwise, stringify the result.
      if (result instanceof Response) {
        return result;
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (error) {
      // 7. Centralized error handling
      return handleError(error);
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

// Helper function for signature verification
async function verifyWebhookSignature(
  body: string, 
  signature: string, 
  secretKey: string
): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const hash = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hash === signature;
}

// Webhook-specific handler
export function createWebhookHandler(
  handler: (supabaseAdmin: SupabaseClient, payload: any, eventType: string) => Promise<Response | any>,
  options: { secretKeyEnvVar: string; signatureHeader: string; }
) {
  return async (req: Request): Promise<Response> => {
    try {
      const secretKey = Deno.env.get(options.secretKeyEnvVar);
      const signature = req.headers.get(options.signatureHeader);
      
      if (!secretKey || !signature) {
        throw new AppError('Webhook not configured correctly.', 500, 'WEBHOOK_CONFIG_ERROR');
      }

      const requestBody = await req.text();
      const isValid = await verifyWebhookSignature(requestBody, signature, secretKey);
      
      if (!isValid) {
        throw new AppError('Invalid webhook signature.', 401, 'WEBHOOK_SIGNATURE_ERROR');
      }

      const payload = JSON.parse(requestBody);
      const eventType = payload.event;

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const result = await handler(supabaseAdmin, payload, eventType);

      if (result instanceof Response) return result;
      return new Response(JSON.stringify(result), { status: 200 });

    } catch (error) {
      return handleError(error);
    }
  };
}
