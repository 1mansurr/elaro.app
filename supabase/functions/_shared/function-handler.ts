/// <reference path="../global.d.ts" />
/// <reference path="../supabase-js.d.ts" />
import {
  createClient,
  type SupabaseClient,
  type User,
} from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// @ts-ignore - ESM imports are valid in Deno runtime
import { z } from 'zod';
import { corsHeaders } from './cors.ts';
import {
  checkRateLimit,
  RateLimitError,
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
import {
  extractTraceContext,
  addTraceHeaders,
  type TraceContext,
} from './tracing.ts';
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
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Define the shape of an authenticated request
export interface AuthenticatedRequest extends Request {
  user: User;
  supabaseClient: SupabaseClient;
  body: Record<string, unknown>;
  traceContext?: TraceContext;
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
    try {
      // Safely stringify error, replacing undefined with null to prevent JSON.parse errors
      const safeErrorForLogging = JSON.parse(
        JSON.stringify(errorForLogging, (_key, value) =>
          value === undefined ? null : value,
        ),
      );
      console.error(
        '--- Function Error ---',
        JSON.stringify(safeErrorForLogging),
      );
    } catch (_stringifyError) {
      // If stringify fails, log a safe message
      console.error('--- Function Error ---', {
        message: error instanceof Error ? error.message : 'Unknown error',
        function: functionName,
      });
    }
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
    // Ensure userMessage is always a string
    const userMessage =
      (error.code && ERROR_MESSAGES[errorCode]
        ? ERROR_MESSAGES[errorCode]
        : sanitizedError) || 'An unexpected error occurred';

    const response: Record<string, unknown> = {
      error:
        typeof userMessage === 'string'
          ? userMessage
          : 'An unexpected error occurred',
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

    // Ensure response can be stringified (replace undefined with null)
    const responseString = JSON.stringify(response, (_key, value) =>
      value === undefined ? null : value,
    );

    return new Response(responseString, {
      status: error.statusCode,
      headers: baseHeaders,
    });
  }

  if (error instanceof RateLimitError) {
    const response: Record<string, unknown> = {
      error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED || 'Rate limit exceeded',
      message: sanitizedError || 'Too many requests',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    };

    // Add Retry-After header if available
    if (error.retryAfter) {
      baseHeaders.set('Retry-After', error.retryAfter.toString());
    }

    // Ensure response can be stringified (replace undefined with null)
    const responseString = JSON.stringify(response, (_key, value) =>
      value === undefined ? null : value,
    );

    return new Response(responseString, {
      status: ERROR_STATUS_CODES.RATE_LIMIT_EXCEEDED,
      headers: baseHeaders,
    });
  }

  // Check if it's a database error
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = mapDatabaseError(error);
    const dbResponse = {
      error: dbError.message || 'Database error occurred',
      code: dbError.code,
    };

    // Ensure response can be stringified (replace undefined with null)
    const dbResponseString = JSON.stringify(dbResponse, (_key, value) =>
      value === undefined ? null : value,
    );

    return new Response(dbResponseString, {
      status: dbError.statusCode,
      headers: baseHeaders,
    });
  }

  // Generic fallback for unexpected errors
  const fallbackResponse = {
    error: ERROR_MESSAGES.INTERNAL_ERROR || 'An internal error occurred',
    code: ERROR_CODES.INTERNAL_ERROR,
  };

  // Ensure response can be stringified (replace undefined with null)
  const fallbackResponseString = JSON.stringify(
    fallbackResponse,
    (_key, value) => (value === undefined ? null : value),
  );

  return new Response(fallbackResponseString, {
    status: ERROR_STATUS_CODES.INTERNAL_ERROR,
    headers: baseHeaders,
  });
}

// The generic handler wrapper
export function createAuthenticatedHandler(
  handler: (
    req: AuthenticatedRequest,
  ) => Promise<Response | Record<string, unknown>>,
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
      // Try both lowercase and capitalized Authorization header (case-insensitive but some runtimes normalize)
      const authHeader =
        req.headers.get('authorization') ??
        req.headers.get('Authorization') ??
        '';

      // Debug logging to verify header arrives
      await logger.info(
        'Authentication header check',
        {
          hasAuthHeader: !!authHeader,
          authHeaderLength: authHeader?.length || 0,
          authHeaderPreview: authHeader?.substring(0, 30) || 'missing',
          allHeaders: Object.fromEntries(req.headers.entries()),
        },
        traceContext,
      );

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        await logger.error(
          'Missing or invalid Authorization header',
          {
            authHeader: authHeader || 'null',
            receivedHeaders: Object.fromEntries(req.headers.entries()),
          },
          traceContext,
        );
        throw new AppError(
          ERROR_MESSAGES.UNAUTHORIZED,
          ERROR_STATUS_CODES.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED,
        );
      }

      // Extract the JWT token from the Bearer header
      // const jwtToken = authHeader.replace('Bearer ', ''); // Unused

      // Verify the JWT token using Supabase Auth REST API
      // This is the most reliable way to verify tokens in Edge Functions
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: authHeader,
          apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        },
      });

      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        await logger.error(
          'Token verification failed',
          {
            status: verifyResponse.status,
            statusText: verifyResponse.statusText,
            error: errorText.substring(0, 200),
            authHeaderPreview: authHeader.substring(0, 30),
            supabaseUrl: supabaseUrl.substring(0, 30),
          },
          traceContext,
        );
        throw new AppError(
          ERROR_MESSAGES.UNAUTHORIZED,
          ERROR_STATUS_CODES.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED,
        );
      }

      const userData = await verifyResponse.json();
      user = userData as User;

      if (!user || !user.id) {
        await logger.error(
          'Invalid user data from token verification',
          {
            userData: userData,
            authHeaderPreview: authHeader.substring(0, 30),
          },
          traceContext,
        );
        throw new AppError(
          ERROR_MESSAGES.UNAUTHORIZED,
          ERROR_STATUS_CODES.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED,
        );
      }

      // Create Supabase client with the verified token for RLS
      supabaseClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        },
      );

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
      // Handle body parsing safely - some functions don't require a body
      let body: Record<string, unknown> = {};
      // const contentType = req.headers.get('content-type') || ''; // Unused
      // const contentLength = req.headers.get('content-length'); // Unused

      // Only try to parse body for POST/PUT/PATCH/DELETE requests
      // Check if there's actually content to parse
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        try {
          // Try to read the body - this will succeed even if empty
          const bodyText = await req.text();
          if (bodyText && bodyText.trim().length > 0) {
            body = JSON.parse(bodyText);
          }
          // If bodyText is empty, body remains {}
        } catch (parseError) {
          // If JSON parsing fails and schema is required, throw error
          if (options.schema) {
            throw new AppError(
              ERROR_MESSAGES.VALIDATION_ERROR,
              ERROR_STATUS_CODES.VALIDATION_ERROR,
              ERROR_CODES.VALIDATION_ERROR,
              {
                message: 'Invalid JSON in request body',
                details:
                  parseError instanceof Error
                    ? parseError.message
                    : String(parseError),
              },
            );
          }
          // For functions without schema, empty body is okay
          body = {};
        }
      }

      // Determine if request has a body for schema validation purposes
      const hasBody = Object.keys(body).length > 0;

      // Enforce schema validation for mutations that have a body
      // Mutations without a body don't need a schema
      if (isMutation && hasBody && !options.schema) {
        throw new AppError(
          'Validation schema required for mutation operations with a body',
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
      // Create AuthenticatedRequest using a Proxy that wraps the Request
      // This allows us to add custom properties (user, supabaseClient, body, traceContext)
      // while preserving all Request properties and methods (like headers)
      // We can't directly set properties on Request because 'body' is read-only
      const authenticatedReq = new Proxy(req, {
        get(target, prop) {
          // Return custom properties first
          if (prop === 'user') return user;
          if (prop === 'supabaseClient') return supabaseClient;
          if (prop === 'body') return body;
          if (prop === 'traceContext') return traceContext;
          // Delegate everything else to the original request
          const value = (target as Record<string, unknown>)[prop as string];
          // If it's a function, bind it to the target to preserve 'this' context
          return typeof value === 'function' ? value.bind(target) : value;
        },
        has(target, prop) {
          return (
            prop === 'user' ||
            prop === 'supabaseClient' ||
            prop === 'body' ||
            prop === 'traceContext' ||
            prop in target
          );
        },
        ownKeys(target) {
          return [
            ...Reflect.ownKeys(target),
            'user',
            'supabaseClient',
            'body',
            'traceContext',
          ];
        },
        getOwnPropertyDescriptor(target, prop) {
          if (
            prop === 'user' ||
            prop === 'supabaseClient' ||
            prop === 'body' ||
            prop === 'traceContext'
          ) {
            return { enumerable: true, configurable: true };
          }
          return Reflect.getOwnPropertyDescriptor(target, prop);
        },
      }) as AuthenticatedRequest;
      const result = await handler(authenticatedReq);

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
      // Ensure errorMessage is always a string, never undefined
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error occurred';

      // Try to get supabaseClient for tracking (may not exist if auth failed)
      let trackingClient: SupabaseClient | null = null;
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
                  message: error.message || 'Unknown error',
                  stack: error.stack || undefined,
                  name: error.name || 'Error',
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
  handler: (
    supabaseAdminClient: SupabaseClient,
  ) => Promise<Response | Record<string, unknown>>,
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
function constantTimeCompare(a: string, b: string): boolean {
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
    payload: Record<string, unknown>,
    eventType: string,
  ) => Promise<Response | Record<string, unknown>>,
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
      const isValid = constantTimeCompare(
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
