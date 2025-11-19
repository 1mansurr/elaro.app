/// <reference path="../global.d.ts" />
/// <reference path="../supabase-js.d.ts" />
import {
  createClient,
  type SupabaseClient,
  type User,
} from 'https://esm.sh/@supabase/supabase-js@2.0.0';
// @ts-ignore - ESM imports are valid in Deno runtime
import { z } from 'zod';
import { corsHeaders } from './cors.ts';
import {
  checkRateLimit,
  RateLimitError,
  RateLimitInfo,
  extractIPAddress,
} from './rate-limiter.ts';
import { checkTaskLimit } from './check-task-limit.ts';
import { createMetricsCollector } from './metrics.ts';
import { recordInvocation } from './function-invocation-tracker.ts';
import {
  addVersionHeaders,
  validateApiVersion,
  getRequestedVersion,
} from './versioning.ts';
import { checkIdempotency, cacheIdempotency } from './idempotency.ts';
import { redactPII } from './pii-redaction.ts';
import { sanitizeErrorMessage } from './pii-redaction.ts';
import {
  mapDatabaseError,
  ERROR_CODES,
  ERROR_STATUS_CODES,
  ERROR_MESSAGES,
  type ErrorCode,
} from './error-codes.ts';
import { extractTraceContext, addTraceHeaders } from './tracing.ts';
import { logger } from './logging.ts';
import {
  captureException,
  setUserContext,
  addBreadcrumb,
  setTag,
} from './sentry-enhanced.ts';
import { shouldBlockRequest, recordViolation } from './abuse-detection.ts';

// Define custom, structured application errors
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any,
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

// Centralized error handler with PII redaction and error sanitization
function handleError(error: unknown, functionName?: string): Response {
  // Sanitize error message for logging (remove internal details)
  const sanitizedError = sanitizeErrorMessage(error);

  // Redact PII from error object before logging
  const errorForLogging = redactPII(
    {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
      function: functionName,
      timestamp: new Date().toISOString(),
    },
    { hashIds: true, maskEmails: true },
  );

  // Error is already logged by logger in the catch block, but keep this for immediate console visibility in development
  // In production, this will be captured by structured logging
  if (Deno.env.get('ENVIRONMENT') === 'development') {
    console.error('--- Function Error ---', JSON.stringify(errorForLogging));
  }

  // Base headers with versioning
  const baseHeaders = new Headers({
    ...corsHeaders,
    ...addVersionHeaders(),
    'Content-Type': 'application/json',
  });

  if (error instanceof AppError) {
    // Use error code from AppError if provided, otherwise default
    const errorCode = (error.code as ErrorCode) || ERROR_CODES.INTERNAL_ERROR;
    const userMessage =
      error.code && ERROR_MESSAGES[errorCode]
        ? ERROR_MESSAGES[errorCode]
        : sanitizedError;

    const response: any = {
      error: userMessage,
      code: errorCode,
    };

    // Only include details if they don't contain sensitive information
    if (error.details) {
      const redactedDetails = redactPII(error.details, {
        hashIds: true,
        maskEmails: true,
      });
      response.details = redactedDetails;
    }

    return new Response(JSON.stringify(response), {
      status: error.statusCode,
      headers: baseHeaders,
    });
  }

  if (error instanceof RateLimitError) {
    const response: any = {
      error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
      message: sanitizedError,
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    };

    // Add Retry-After header if available
    if (error.retryAfter) {
      baseHeaders.set('Retry-After', error.retryAfter.toString());
    }

    return new Response(JSON.stringify(response), {
      status: ERROR_STATUS_CODES.RATE_LIMIT_EXCEEDED,
      headers: baseHeaders,
    });
  }

  // Check if it's a database error
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = mapDatabaseError(error);
    return new Response(
      JSON.stringify({
        error: dbError.message,
        code: dbError.code,
      }),
      {
        status: dbError.statusCode,
        headers: baseHeaders,
      },
    );
  }

  // Generic fallback for unexpected errors
  return new Response(
    JSON.stringify({
      error: ERROR_MESSAGES.INTERNAL_ERROR,
      code: ERROR_CODES.INTERNAL_ERROR,
    }),
    {
      status: ERROR_STATUS_CODES.INTERNAL_ERROR,
      headers: baseHeaders,
    },
  );
}

// The generic handler wrapper
export function createAuthenticatedHandler(
  handler: (req: AuthenticatedRequest) => Promise<Response | any>,
  options: {
    rateLimitName: string;
    checkTaskLimit?: boolean;
    schema?: z.ZodSchema;
    requireIdempotency?: boolean; // Require idempotency key for mutations
  },
) {
  return async (req: Request): Promise<Response> => {
    // Extract trace context
    const traceContext = extractTraceContext(req);

    // Create metrics collector
    const metrics = createMetricsCollector(options.rateLimitName);

    // Track function invocation start time
    const startTime = performance.now();
    let userId: string | undefined;
    // Declare user and supabaseClient outside try block so they're accessible in catch
    let user: User | null = null;
    let supabaseClient: SupabaseClient | null = null;

    if (req.method === 'OPTIONS') {
      const responseHeaders = new Headers(corsHeaders);
      addTraceHeaders(responseHeaders, traceContext);
      return new Response('ok', { headers: responseHeaders });
    }

    try {
      // Add breadcrumb for request start
      addBreadcrumb(
        `Request received: ${options.rateLimitName}`,
        'request',
        'info',
        {
          method: req.method,
          function: options.rateLimitName,
          traceId: traceContext.traceId,
        },
      );

      // 0. Check API version
      const requestedVersion = getRequestedVersion(req);
      if (!validateApiVersion(requestedVersion)) {
        throw new AppError(
          ERROR_MESSAGES.UNSUPPORTED_VERSION,
          ERROR_STATUS_CODES.UNSUPPORTED_VERSION,
          ERROR_CODES.UNSUPPORTED_VERSION,
        );
      }

      // 1. Authenticate user
      supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: req.headers.get('Authorization')! },
          },
        },
      );
      const {
        data: { user: authUser },
        error: authError,
      } = await supabaseClient.auth.getUser();
      user = authUser;
      if (authError || !user) {
        throw new AppError(
          ERROR_MESSAGES.UNAUTHORIZED,
          ERROR_STATUS_CODES.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED,
        );
      }

      // Set Sentry user context
      setUserContext(user.id);
      setTag('trace_id', traceContext.traceId);

      // 1.5. Check abuse status (after authentication, before rate limiting)
      // Fail-safe: if abuse check fails, allow request to proceed
      try {
        const ipAddress = extractIPAddress(req);
        const abuseCheck = await shouldBlockRequest(
          supabaseClient,
          user.id,
          ipAddress,
        );

        if (abuseCheck.blocked) {
          // Record the blocked attempt as a violation
          await recordViolation(
            supabaseClient,
            user.id,
            ipAddress,
            'rate_limit',
          ).catch(() => {
            // Non-critical: if recording fails, still block the request
          });

          throw new AppError(
            abuseCheck.message || ERROR_MESSAGES.FORBIDDEN,
            ERROR_STATUS_CODES.FORBIDDEN,
            ERROR_CODES.FORBIDDEN,
          );
        }
      } catch (error) {
        // If it's an AppError from blocking, re-throw it
        if (error instanceof AppError && error.code === ERROR_CODES.FORBIDDEN) {
          throw error;
        }
        // Otherwise, abuse check failed (e.g., DB error) - fail-safe: allow request
        // Log the error for monitoring but don't block legitimate users
        await logger.warn(
          'Abuse check failed, allowing request',
          {
            error: error instanceof Error ? error.message : String(error),
            userId: user.id,
          },
          traceContext,
        );
      }

      // 2. Enforce idempotency key requirement for mutations if specified
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
        req.method,
      );
      const idempotencyKey = req.headers.get('Idempotency-Key');

      if (isMutation && options.requireIdempotency && !idempotencyKey) {
        throw new AppError(
          ERROR_MESSAGES.IDEMPOTENCY_KEY_REQUIRED,
          ERROR_STATUS_CODES.IDEMPOTENCY_KEY_REQUIRED,
          ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED,
        );
      }

      // Check idempotency key (for POST/PUT/DELETE operations)
      if (idempotencyKey && isMutation) {
        const idempotencyResult = await checkIdempotency(
          supabaseClient,
          user.id,
          idempotencyKey,
        );
        if (idempotencyResult.cached) {
          // Idempotency key cache hit - returning cached response
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

      // 3. Rate limit and capture limit info (checks both user and IP)
      const rateLimitInfo = await checkRateLimit(
        supabaseClient,
        user.id,
        options.rateLimitName,
        req,
      );

      // 4. Check task limit if enabled
      if (options.checkTaskLimit) {
        const limitError = await checkTaskLimit(supabaseClient, user.id);
        if (limitError) {
          return limitError;
        }
      }

      // 5. Parse body and enforce validation for mutations
      let body = await req.json();

      // Enforce schema validation for mutations
      if (isMutation && !options.schema) {
        throw new AppError(
          'Validation schema required for mutation operations',
          ERROR_STATUS_CODES.VALIDATION_SCHEMA_MISSING,
          ERROR_CODES.VALIDATION_SCHEMA_MISSING,
        );
      }

      if (options.schema) {
        const validationResult = options.schema.safeParse(body);
        if (!validationResult.success) {
          throw new AppError(
            ERROR_MESSAGES.VALIDATION_ERROR,
            ERROR_STATUS_CODES.VALIDATION_ERROR,
            ERROR_CODES.VALIDATION_ERROR,
            validationResult.error.flatten(),
          );
        }
        body = validationResult.data; // Use the parsed (and potentially transformed) data
      }

      // 6. Log structured request with PII redaction and tracing
      await logger.info(
        'Request received',
        {
          function: options.rateLimitName,
          user_id: user.id,
          method: req.method,
          has_idempotency_key: !!idempotencyKey,
          api_version: requestedVersion,
        },
        traceContext,
      );

      // Execute the specific business logic
      const result = await handler({ ...req, user, supabaseClient, body });

      // 7. Cache response for idempotency if key was provided
      if (
        idempotencyKey &&
        (req.method === 'POST' ||
          req.method === 'PUT' ||
          req.method === 'DELETE')
      ) {
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

      // Track function invocation (async, don't await)
      const durationMs = Math.round(performance.now() - startTime);
      recordInvocation(supabaseClient, {
        functionName: options.rateLimitName,
        durationMs,
        statusCode,
        userId,
        metadata: {
          method: req.method,
          api_version: requestedVersion,
        },
      }).catch(err => {
        // Non-critical: if tracking fails, log but don't fail the request
        logger.warn(
          'Failed to record function invocation',
          {
            error: err instanceof Error ? err.message : String(err),
            function_name: options.rateLimitName,
          },
          traceContext,
        );
      });

      // Log structured response with PII redaction and tracing
      await logger.info(
        'Request completed',
        {
          function: options.rateLimitName,
          user_id: user.id,
          status: statusCode,
          rate_limit_remaining: rateLimitInfo.remaining,
        },
        traceContext,
      );

      // 9. Return success response with rate limit, version, and trace headers
      const responseHeaders = new Headers({
        ...corsHeaders,
        ...addVersionHeaders(),
        'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
        'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
        'X-RateLimit-Reset': rateLimitInfo.reset.toString(),
        'Content-Type': 'application/json',
      });

      // Add trace headers
      addTraceHeaders(responseHeaders, traceContext);

      // If the handler already returned a Response object, add trace headers
      if (result instanceof Response) {
        // Clone headers and add trace context
        const clonedHeaders = new Headers(result.headers);
        addTraceHeaders(clonedHeaders, traceContext);

        return new Response(result.body, {
          status: result.status,
          statusText: result.statusText,
          headers: clonedHeaders,
        });
      }

      return new Response(JSON.stringify(result), {
        headers: responseHeaders,
        status: 200,
      });
    } catch (error) {
      // Track function invocation with error (async, don't await)
      // Note: supabaseClient may not be available if auth failed
      const durationMs = Math.round(performance.now() - startTime);
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Try to get supabaseClient for tracking (may not exist if auth failed)
      let trackingClient: any;
      try {
        trackingClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
      } catch {
        // Can't track if we can't create client
      }

      if (trackingClient) {
        recordInvocation(trackingClient, {
          functionName: options.rateLimitName,
          durationMs,
          statusCode,
          errorMessage,
          userId,
          metadata: {
            error_type:
              error instanceof AppError
                ? 'AppError'
                : error instanceof Error
                  ? error.constructor.name
                  : 'Unknown',
          },
        }).catch(() => {
          // Non-critical: if tracking fails, ignore
        });
      }

      // 10. Record error metrics and abuse violations
      if (error instanceof AppError) {
        metrics.recordError('AppError', error.message);
        metrics.incrementStatusCode(error.statusCode);
      } else if (error instanceof RateLimitError) {
        metrics.recordError('RateLimitError', error.message);
        // Record abuse violation when rate limit is exceeded
        // Note: user and supabaseClient are only available if auth succeeded
        if (user && supabaseClient) {
          try {
            const ipAddress = extractIPAddress(req);
            await recordViolation(
              supabaseClient,
              user.id,
              ipAddress,
              'rate_limit',
            ).catch(() => {
              // Non-critical: if recording fails, still return rate limit error
            });
          } catch (violationError) {
            // Non-critical: log but don't fail the error response
            await logger.warn(
              'Failed to record rate limit violation',
              {
                error:
                  violationError instanceof Error
                    ? violationError.message
                    : String(violationError),
              },
              traceContext,
            );
          }
        }
      } else {
        metrics.recordError('UnknownError', 'Unknown error occurred');
      }

      // Log error with tracing
      await logger.error(
        'Request failed',
        {
          function: options.rateLimitName,
          error:
            error instanceof Error
              ? {
                  message: error.message,
                  stack: error.stack,
                  name: error.name,
                }
              : { message: String(error) },
        },
        traceContext,
      );

      // Capture in Sentry with full context
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          function: options.rateLimitName,
          traceId: traceContext.traceId,
          metadata: {
            spanId: traceContext.spanId,
          },
        },
      );

      // 9. Centralized error handling with function name for context
      return handleError(error, options.rateLimitName);
    } finally {
      // Ensure metrics are recorded even if there's an error
      metrics.recordExecutionTime();
    }
  };
}

// New handler for scheduled functions (cron jobs) that need admin access
export function createScheduledHandler(
  handler: (supabaseAdminClient: SupabaseClient) => Promise<Response | any>,
  options?: { requireSecret?: boolean; secretEnvVar?: string },
) {
  return async (req: Request): Promise<Response> => {
    try {
      // Check for secret if this handler requires it
      if (options?.requireSecret) {
        const secret = Deno.env.get(options.secretEnvVar || 'CRON_SECRET');
        const authHeader = req.headers.get('Authorization');
        if (!secret || authHeader !== `Bearer ${secret}`) {
          throw new AppError(
            ERROR_MESSAGES.CRON_AUTH_ERROR,
            ERROR_STATUS_CODES.CRON_AUTH_ERROR,
            ERROR_CODES.CRON_AUTH_ERROR,
          );
        }
      }

      // Create an admin client with the service role key to bypass RLS
      const supabaseAdminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
  handler: (
    supabaseAdmin: SupabaseClient,
    payload: any,
    eventType: string,
  ) => Promise<Response | any>,
  options: { secretKeyEnvVar: string; headerName: string },
) {
  return async (req: Request): Promise<Response> => {
    try {
      // Get the expected authorization header value from environment variables
      const expectedAuthHeader = Deno.env.get(options.secretKeyEnvVar);

      // Get the authorization header from the incoming request
      const receivedAuthHeader = req.headers.get(options.headerName);

      // Validate that both are present
      if (!expectedAuthHeader || !receivedAuthHeader) {
        await logger.error(
          'Webhook authentication failed: Missing authorization header or secret',
          {},
          { traceId: 'webhook' },
        );
        throw new AppError(
          ERROR_MESSAGES.WEBHOOK_CONFIG_ERROR,
          ERROR_STATUS_CODES.WEBHOOK_CONFIG_ERROR,
          ERROR_CODES.WEBHOOK_CONFIG_ERROR,
        );
      }

      // Securely compare the authorization headers using constant-time comparison
      // This prevents timing attacks
      const isValid = await constantTimeCompare(
        receivedAuthHeader,
        expectedAuthHeader,
      );

      if (!isValid) {
        await logger.error(
          'Webhook authentication failed: Invalid authorization header',
          {},
          { traceId: 'webhook' },
        );
        throw new AppError(
          ERROR_MESSAGES.WEBHOOK_AUTH_ERROR,
          ERROR_STATUS_CODES.WEBHOOK_AUTH_ERROR,
          ERROR_CODES.WEBHOOK_AUTH_ERROR,
        );
      }

      await logger.info(
        'Webhook authorization verified successfully',
        {},
        { traceId: 'webhook' },
      );

      // Parse the request body
      const requestBody = await req.text();
      const payload = JSON.parse(requestBody);
      const eventType = payload.event?.type || 'UNKNOWN';

      // Create Supabase admin client for database operations
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );

      // Call the main handler function with the parsed payload
      const result = await handler(supabaseAdmin, payload, eventType);

      // Return the result as JSON response
      if (result instanceof Response) return result;
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return handleError(error);
    }
  };
}
