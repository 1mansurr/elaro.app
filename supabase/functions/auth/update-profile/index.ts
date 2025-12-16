import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../../_shared/cors.ts';
import { successResponse, errorResponse } from '../../_shared/response.ts';
import { UpdateProfileSchema } from '../../_shared/schemas/auth.ts';
import { AppError, ERROR_CODES } from '../../_shared/function-handler.ts';
import { logger } from '../../_shared/logging.ts';
import { extractTraceContext } from '../../_shared/tracing.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const traceContext = extractTraceContext(req);

  try {
    // Get auth token from header
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization header required', 401, 'UNAUTHORIZED');
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = UpdateProfileSchema.parse(body);

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
    const { data: { user }, error: getUserError } = await supabaseClient.auth.getUser();
    
    if (getUserError || !user) {
      throw new AppError('User not found', 401, 'UNAUTHORIZED');
    }

    // Update user metadata or password
    const updateData: Record<string, any> = {};
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
    const body = await req.json();
    const password = body.password;

    const updatePayload: { data?: Record<string, any>; password?: string } = {};
    if (Object.keys(updateData).length > 0) {
      updatePayload.data = updateData;
    }
    if (password) {
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
        ERROR_CODES.AUTH_ERROR || 'AUTH_ERROR',
      );
    }

    await logger.info(
      'Profile updated successfully',
      {
        user_id: user.id,
      },
      traceContext,
    );

    return successResponse({
      user: data.user,
    });
  } catch (error) {
    await logger.error(
      'Update profile error',
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

