// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../../_shared/cors.ts';
import { successResponse, errorResponse } from '../../_shared/response.ts';
import { VerifyEmailSchema } from '../../_shared/schemas/auth.ts';
import { AppError } from '../../_shared/function-handler.ts';
import { ERROR_CODES } from '../../_shared/error-codes.ts';
import { logger } from '../../_shared/logging.ts';
import { extractTraceContext } from '../../_shared/tracing.ts';

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  const traceContext = extractTraceContext(req);

  try {
    // Parse and validate request body (PASS 1: Crash safety)
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      return errorResponse(
        new AppError(
          'Invalid or missing JSON body',
          400,
          ERROR_CODES.VALIDATION_ERROR,
        ),
        400,
        {},
        origin,
      );
    }

    // Use safeParse to prevent ZodError from crashing worker
    const validationResult = VerifyEmailSchema.safeParse(body);
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

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify email with token
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      token: validatedData.token,
      type: validatedData.type || 'signup',
    });

    if (error) {
      await logger.error(
        'Email verification failed',
        {
          error: error.message,
        },
        traceContext,
      );
      throw new AppError(
        error.message || 'Invalid or expired verification token',
        error.status || 400,
        ERROR_CODES.INVALID_TOKEN,
      );
    }

    await logger.info(
      'Email verified successfully',
      {
        user_id: data.user?.id,
      },
      traceContext,
    );

    return successResponse(
      {
        user: data.user,
        session: data.session,
      },
      {},
      origin,
    );
  } catch (error) {
    await logger.error(
      'Email verification error',
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
