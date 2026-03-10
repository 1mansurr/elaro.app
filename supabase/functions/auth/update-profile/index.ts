// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../../_shared/cors.ts';
import { successResponse, errorResponse } from '../../_shared/response.ts';
import { UpdateProfileSchema } from '../../_shared/schemas/auth.ts';
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
    // Get auth token from header
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization header required', 401, 'UNAUTHORIZED');
    }

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
    const validationResult = UpdateProfileSchema.safeParse(body);
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

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get current user
    const {
      data: { user },
      error: getUserError,
    } = await supabaseClient.auth.getUser();

    if (getUserError || !user) {
      throw new AppError('User not found', 401, 'UNAUTHORIZED');
    }

    // Update user metadata or password
    const updateData: Record<string, unknown> = {};
    if (validatedData.first_name !== undefined) {
      updateData.first_name = validatedData.first_name;
    }
    if (validatedData.last_name !== undefined) {
      updateData.last_name = validatedData.last_name;
    }
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }

    // Check if password is being updated (from body, not schema)
    // PASS 2: Validate body is object before accessing properties
    const password =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as { password?: unknown }).password
        : undefined;

    const updatePayload: { data?: Record<string, unknown>; password?: string } =
      {};
    if (Object.keys(updateData).length > 0) {
      updatePayload.data = updateData;
    }
    if (password && typeof password === 'string') {
      updatePayload.password = password;
    }

    const { data, error } = await supabaseClient.auth.updateUser(updatePayload);

    if (error) {
      await logger.error(
        'Update profile failed',
        {
          user_id: user.id,
          error: error.message,
        },
        traceContext,
      );
      throw new AppError(
        error.message || 'Failed to update profile',
        error.status || 400,
        ERROR_CODES.INVALID_TOKEN,
      );
    }

    await logger.info(
      'Profile updated successfully',
      {
        user_id: user.id,
      },
      traceContext,
    );

    return successResponse(
      {
        user: data.user,
      },
      {},
      origin,
    );
  } catch (error) {
    await logger.error(
      'Update profile error',
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
