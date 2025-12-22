import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../../_shared/cors.ts';
import { successResponse, errorResponse } from '../../_shared/response.ts';
import { ResetPasswordSchema } from '../../_shared/schemas/auth.ts';
import { AppError, ERROR_CODES } from '../../_shared/function-handler.ts';
import { logger } from '../../_shared/logging.ts';
import { extractTraceContext } from '../../_shared/tracing.ts';
import {
  checkRateLimit,
  extractIPAddress,
} from '../../_shared/rate-limiter.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const traceContext = extractTraceContext(req);

  try {
    // Rate limiting (by IP for public endpoints)
    const ipAddress = extractIPAddress(req);
    await checkRateLimit('auth-reset-password', ipAddress);

    // Parse and validate request body
    const body = await req.json();
    const validatedData = ResetPasswordSchema.parse(body);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Send password reset email
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
      validatedData.email,
      {
        redirectTo: validatedData.redirectTo || 'elaro://reset-password',
      },
    );

    if (error) {
      await logger.error(
        'Password reset request failed',
        {
          email: validatedData.email,
          error: error.message,
        },
        traceContext,
      );
      throw new AppError(
        error.message || 'Failed to send password reset email',
        error.status || 400,
        ERROR_CODES.AUTH_ERROR || 'AUTH_ERROR',
      );
    }

    await logger.info(
      'Password reset email sent',
      {
        email: validatedData.email,
      },
      traceContext,
    );

    return successResponse({
      message: 'Password reset email sent',
    });
  } catch (error) {
    await logger.error(
      'Password reset error',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );

    if (error instanceof AppError) {
      return errorResponse(error, error.statusCode);
    }

    if (error instanceof Error && error.name === 'ZodError') {
      return errorResponse(
        new AppError('Invalid input data', 400, 'VALIDATION_ERROR'),
        400,
      );
    }

    return errorResponse(
      new AppError('Internal server error', 500, ERROR_CODES.INTERNAL_ERROR),
      500,
    );
  }
});
