import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../../_shared/cors.ts';
import { successResponse, errorResponse } from '../../_shared/response.ts';
import { AppError, ERROR_CODES } from '../../_shared/function-handler.ts';
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

    // const token = authHeader.replace('Bearer ', ''); // Unused

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

    // Get user info before signing out
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    const userId = user?.id;

    // Sign out
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      await logger.error(
        'Signout failed',
        {
          user_id: userId,
          error: error.message,
        },
        traceContext,
      );
      throw new AppError(
        error.message || 'Failed to sign out',
        error.status || 500,
        ERROR_CODES.AUTH_ERROR || 'AUTH_ERROR',
      );
    }

    await logger.info(
      'User signed out successfully',
      {
        user_id: userId,
      },
      traceContext,
    );

    return successResponse({ success: true }, {}, origin);
  } catch (error) {
    await logger.error(
      'Signout error',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );

    if (error instanceof AppError) {
      return errorResponse(error, error.statusCode, {}, origin);
    }

    return errorResponse(
      new AppError('Internal server error', 500, ERROR_CODES.INTERNAL_ERROR),
      500,
      {},
      origin,
    );
  }
});
