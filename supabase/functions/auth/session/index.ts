import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../../_shared/cors.ts';
import { successResponse, errorResponse } from '../../_shared/response.ts';
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
      // Return null session if no auth header (not an error)
      return successResponse({ session: null, user: null });
    }

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

    // Get session
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      await logger.error(
        'Get session failed',
        {
          error: error.message,
        },
        traceContext,
      );
      throw new AppError(
        error.message || 'Failed to get session',
        error.status || 500,
        ERROR_CODES.AUTH_ERROR || 'AUTH_ERROR',
      );
    }

    return successResponse({
      session: data.session,
      user: data.session?.user || null,
    });
  } catch (error) {
    await logger.error(
      'Get session error',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );

    if (error instanceof AppError) {
      return errorResponse(error, error.statusCode);
    }

    return errorResponse(
      new AppError('Internal server error', 500, ERROR_CODES.INTERNAL_ERROR),
      500,
    );
  }
});
