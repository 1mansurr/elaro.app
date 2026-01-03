import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../../_shared/cors.ts';
import { successResponse, errorResponse } from '../../_shared/response.ts';
import { AppError, ERROR_CODES } from '../../_shared/function-handler.ts';
import { logger } from '../../_shared/logging.ts';
import { extractTraceContext } from '../../_shared/tracing.ts';
import {
  checkRateLimit,
  extractIPAddress,
} from '../../_shared/rate-limiter.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// Schemas
const CheckLockoutSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const RecordFailedAttemptSchema = z.object({
  email: z.string().email('Invalid email address'),
  reason: z.string().default('invalid_credentials'),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

const RecordSuccessfulLoginSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  method: z.string().default('email'),
  deviceInfo: z
    .object({
      platform: z.string().optional(),
      version: z.string().optional(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .optional(),
});

const ResetAttemptsSchema = z.object({
  userIdOrEmail: z.string().min(1, 'User ID or email is required'),
});

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  const traceContext = extractTraceContext(req);
  const ipAddress = extractIPAddress(req);

  try {
    // Rate limiting (by IP for public endpoints)
    await checkRateLimit('auth-lockout', ipAddress);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Route to appropriate handler
    if (method === 'GET' && path.endsWith('/check-lockout')) {
      return await handleCheckLockout(req, supabaseAdmin, traceContext, origin);
    } else if (method === 'POST' && path.endsWith('/record-failed-attempt')) {
      return await handleRecordFailedAttempt(
        req,
        supabaseAdmin,
        ipAddress,
        traceContext,
        origin,
      );
    } else if (method === 'POST' && path.endsWith('/record-successful-login')) {
      return await handleRecordSuccessfulLogin(
        req,
        supabaseAdmin,
        ipAddress,
        traceContext,
        origin,
      );
    } else if (method === 'POST' && path.endsWith('/reset-attempts')) {
      return await handleResetAttempts(
        req,
        supabaseAdmin,
        traceContext,
        origin,
      );
    } else {
      throw new AppError('Invalid endpoint', 404, ERROR_CODES.NOT_FOUND);
    }
  } catch (error) {
    await logger.error(
      'Auth lockout error',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );

    if (error instanceof AppError) {
      return errorResponse(error, error.statusCode, {}, origin);
    }

    // ZodError should never reach here (caught by safeParse above)
    // But keep as fallback for safety
    if (error instanceof Error && error.name === 'ZodError') {
      return errorResponse(
        new AppError('Invalid input data', 400, ERROR_CODES.VALIDATION_ERROR),
        400,
        {},
        origin,
      );
    }

    return errorResponse(
      new AppError('Internal server error', 500, ERROR_CODES.INTERNAL_ERROR),
      500,
      {},
      origin,
    );
  }
});

/**
 * Check if an account is locked
 * GET /auth/lockout/check-lockout?email=...
 */
async function handleCheckLockout(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>,
  traceContext: Record<string, unknown>,
  origin: string | null,
): Promise<Response> {
  const url = new URL(req.url);
  const email = url.searchParams.get('email');

  if (!email) {
    throw new AppError('Email parameter is required', 400, 'VALIDATION_ERROR');
  }

  // PASS 1: Use safeParse to prevent ZodError from crashing worker
  const validationResult = CheckLockoutSchema.safeParse({ email });
  if (!validationResult.success) {
    const zodError = validationResult.error;
    const flattened = zodError.flatten();
    return errorResponse(
      new AppError('Invalid input data', 400, ERROR_CODES.VALIDATION_ERROR, {
        errors: flattened.fieldErrors,
        formErrors: flattened.formErrors,
      }),
      400,
      {},
      origin,
    );
  }
  const validatedData = validationResult.data;

  // Get user lockout status
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('locked_until, failed_login_attempts')
    .eq('email', validatedData.email)
    .single();

  if (error) {
    // If user not found or permission denied, assume not locked
    if (error.code === 'PGRST116' || error.code === '42501') {
      await logger.warn(
        'User not found or permission denied for lockout check',
        { email: validatedData.email, error: error.code },
        traceContext,
      );
      return successResponse(
        {
          isLocked: false,
        },
        {},
        origin,
      );
    }
    throw new AppError(
      error.message || 'Failed to check lockout status',
      500,
      ERROR_CODES.DB_ERROR,
    );
  }

  if (!user) {
    return successResponse(
      {
        isLocked: false,
      },
      {},
      origin,
    );
  }

  // Check if account is locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesRemaining = Math.ceil(
      (new Date(user.locked_until).getTime() - Date.now()) / 60000,
    );

    return successResponse(
      {
        isLocked: true,
        lockedUntil: user.locked_until,
        minutesRemaining,
      },
      {},
      origin,
    );
  }

  // If lockout expired, auto-unlock
  if (user.locked_until && new Date(user.locked_until) <= new Date()) {
    await resetFailedAttemptsInternal(
      supabaseAdmin,
      validatedData.email,
      traceContext,
    );
    return successResponse(
      {
        isLocked: false,
        attemptsRemaining: MAX_ATTEMPTS,
      },
      {},
      origin,
    );
  }

  // Calculate attempts remaining
  const attemptsRemaining = MAX_ATTEMPTS - (user.failed_login_attempts || 0);

  return successResponse(
    {
      isLocked: false,
      attemptsRemaining,
    },
    {},
    origin,
  );
}

/**
 * Record a failed login attempt
 * POST /auth/lockout/record-failed-attempt
 */
async function handleRecordFailedAttempt(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>,
  ipAddress: string,
  traceContext: Record<string, unknown>,
  origin: string | null,
): Promise<Response> {
  // PASS 1: Crash safety - wrap req.json() in try/catch
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    return errorResponse(
      new AppError('Invalid or missing JSON body', 400, ERROR_CODES.VALIDATION_ERROR),
      400,
      {},
      origin,
    );
  }

  // PASS 1: Use safeParse to prevent ZodError from crashing worker
  // PASS 2: Validate body is object before accessing properties
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return errorResponse(
      new AppError('Request body must be an object', 400, ERROR_CODES.VALIDATION_ERROR),
      400,
      {},
      origin,
    );
  }

  const bodyObj = body as Record<string, unknown>;
  const validationResult = RecordFailedAttemptSchema.safeParse({
    ...bodyObj,
    ipAddress: bodyObj.ipAddress || ipAddress,
  });
  if (!validationResult.success) {
    const zodError = validationResult.error;
    const flattened = zodError.flatten();
    return errorResponse(
      new AppError('Invalid input data', 400, ERROR_CODES.VALIDATION_ERROR, {
        errors: flattened.fieldErrors,
        formErrors: flattened.formErrors,
      }),
      400,
      {},
      origin,
    );
  }
  const validatedData = validationResult.data;

  // Get current failed attempts count
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, failed_login_attempts')
    .eq('email', validatedData.email)
    .single();

  if (userError || !user) {
    // User not found - silently fail (don't reveal if email exists)
    await logger.warn(
      'User not found for failed attempt recording',
      { email: validatedData.email },
      traceContext,
    );
    return successResponse({ recorded: true }, {}, origin);
  }

  const attempts = (user.failed_login_attempts || 0) + 1;

  // Record login attempt in login_attempts table
  await supabaseAdmin.from('login_attempts').insert({
    email: validatedData.email,
    user_id: user.id,
    success: false,
    ip_address: validatedData.ipAddress,
    user_agent: validatedData.userAgent,
    failure_reason: validatedData.reason,
  });

  // Lock account if max attempts reached
  if (attempts >= MAX_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);

    await supabaseAdmin
      .from('users')
      .update({
        failed_login_attempts: attempts,
        locked_until: lockedUntil.toISOString(),
      })
      .eq('email', validatedData.email);

    await logger.warn(
      'Account locked due to max failed attempts',
      {
        email: validatedData.email,
        attempts,
        lockedUntil: lockedUntil.toISOString(),
      },
      traceContext,
    );
  } else {
    // Just increment failed attempts
    await supabaseAdmin
      .from('users')
      .update({ failed_login_attempts: attempts })
      .eq('email', validatedData.email);

    await logger.info(
      'Failed login attempt recorded',
      {
        email: validatedData.email,
        attempts,
        maxAttempts: MAX_ATTEMPTS,
      },
      traceContext,
    );
  }

  return successResponse(
    {
      recorded: true,
      attempts,
      isLocked: attempts >= MAX_ATTEMPTS,
    },
    {},
    origin,
  );
}

/**
 * Record a successful login
 * POST /auth/lockout/record-successful-login
 */
async function handleRecordSuccessfulLogin(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>,
  ipAddress: string,
  traceContext: Record<string, unknown>,
  origin: string | null,
): Promise<Response> {
  // PASS 1: Crash safety - wrap req.json() in try/catch
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    return errorResponse(
      new AppError('Invalid or missing JSON body', 400, ERROR_CODES.VALIDATION_ERROR),
      400,
      {},
      origin,
    );
  }

  // PASS 1: Use safeParse to prevent ZodError from crashing worker
  // PASS 2: Validate body is object before accessing properties
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return errorResponse(
      new AppError('Request body must be an object', 400, ERROR_CODES.VALIDATION_ERROR),
      400,
      {},
      origin,
    );
  }

  const bodyObj = body as Record<string, unknown>;
  const validationResult = RecordSuccessfulLoginSchema.safeParse({
    ...bodyObj,
    deviceInfo: {
      ...(bodyObj.deviceInfo && typeof bodyObj.deviceInfo === 'object' && !Array.isArray(bodyObj.deviceInfo)
        ? bodyObj.deviceInfo
        : {}),
      ipAddress:
        (bodyObj.deviceInfo &&
          typeof bodyObj.deviceInfo === 'object' &&
          !Array.isArray(bodyObj.deviceInfo) &&
          (bodyObj.deviceInfo as { ipAddress?: unknown }).ipAddress) ||
        ipAddress,
    },
  });
  if (!validationResult.success) {
    const zodError = validationResult.error;
    const flattened = zodError.flatten();
    return errorResponse(
      new AppError('Invalid input data', 400, ERROR_CODES.VALIDATION_ERROR, {
        errors: flattened.fieldErrors,
        formErrors: flattened.formErrors,
      }),
      400,
      {},
      origin,
    );
  }
  const validatedData = validationResult.data;

  // Get user email
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('id', validatedData.userId)
    .single();

  if (userError || !user) {
    throw new AppError('User not found', 404, ERROR_CODES.DB_NOT_FOUND);
  }

  // Record in login_attempts
  await supabaseAdmin.from('login_attempts').insert({
    email: user.email,
    user_id: validatedData.userId,
    success: true,
    ip_address: validatedData.deviceInfo?.ipAddress,
    user_agent: validatedData.deviceInfo?.userAgent,
    device_info: validatedData.deviceInfo
      ? {
          platform: validatedData.deviceInfo.platform,
          version: validatedData.deviceInfo.version,
        }
      : null,
  });

  // Record in login_history
  await supabaseAdmin.from('login_history').insert({
    user_id: validatedData.userId,
    success: true,
    method: validatedData.method,
    ip_address: validatedData.deviceInfo?.ipAddress,
    user_agent: validatedData.deviceInfo?.userAgent,
    device_info: validatedData.deviceInfo
      ? {
          platform: validatedData.deviceInfo.platform,
          version: validatedData.deviceInfo.version,
        }
      : null,
  });

  // Reset failed attempts
  await resetFailedAttemptsInternal(
    supabaseAdmin,
    validatedData.userId,
    traceContext,
  );

  await logger.info(
    'Successful login recorded',
    {
      userId: validatedData.userId,
      method: validatedData.method,
    },
    traceContext,
  );

  return successResponse({ recorded: true }, {}, origin);
}

/**
 * Reset failed login attempts
 * POST /auth/lockout/reset-attempts
 */
async function handleResetAttempts(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>,
  traceContext: Record<string, unknown>,
  origin: string | null,
): Promise<Response> {
  // PASS 1: Crash safety - wrap req.json() in try/catch
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    return errorResponse(
      new AppError('Invalid or missing JSON body', 400, ERROR_CODES.VALIDATION_ERROR),
      400,
      {},
      origin,
    );
  }

  // PASS 1: Use safeParse to prevent ZodError from crashing worker
  const validationResult = ResetAttemptsSchema.safeParse(body);
  if (!validationResult.success) {
    const zodError = validationResult.error;
    const flattened = zodError.flatten();
    return errorResponse(
      new AppError('Invalid input data', 400, ERROR_CODES.VALIDATION_ERROR, {
        errors: flattened.fieldErrors,
        formErrors: flattened.formErrors,
      }),
      400,
      {},
      origin,
    );
  }
  const validatedData = validationResult.data;

  await resetFailedAttemptsInternal(
    supabaseAdmin,
    validatedData.userIdOrEmail,
    traceContext,
  );

  return successResponse({ reset: true }, {}, origin);
}

/**
 * Internal helper to reset failed attempts
 */
async function resetFailedAttemptsInternal(
  supabaseAdmin: ReturnType<typeof createClient>,
  userIdOrEmail: string,
  traceContext: Record<string, unknown>,
): Promise<void> {
  // Check if it's an email or UUID
  const isEmail = userIdOrEmail.includes('@');

  const updateQuery = supabaseAdmin.from('users').update({
    failed_login_attempts: 0,
    locked_until: null,
  });

  if (isEmail) {
    await updateQuery.eq('email', userIdOrEmail);
  } else {
    await updateQuery.eq('id', userIdOrEmail);
  }

  await logger.info('Failed attempts reset', { userIdOrEmail }, traceContext);
}
