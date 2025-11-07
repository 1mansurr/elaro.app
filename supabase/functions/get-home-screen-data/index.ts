import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
} from '../_shared/function-handler.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';

// The core business logic for fetching home screen data
async function handleGetHomeScreenData(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const traceContext = extractTraceContext(req as unknown as Request);

  await logger.info(
    'Fetching home screen data',
    { user_id: user.id },
    traceContext,
  );

  const { data, error } = await supabaseClient.rpc(
    'get_home_screen_data_for_user',
    {
      p_user_id: user.id,
    },
  );

  if (error) {
    await logger.error(
      'Error calling get_home_screen_data_for_user RPC',
      {
        user_id: user.id,
        error: error.message,
      },
      traceContext,
    );
    throw handleDbError(error);
  }

  await logger.info(
    'Successfully fetched home screen data',
    { user_id: user.id },
    traceContext,
  );

  // The RPC function returns the data in the exact JSON format we need.
  return data;
}

// Wrap the business logic with our secure, generic handler
serve(
  createAuthenticatedHandler(handleGetHomeScreenData, {
    rateLimitName: 'get-home-screen-data',
    // No schema needed for a GET request with no body
    // No task limit check needed for a read operation
  }),
);
