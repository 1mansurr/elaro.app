import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
} from '../_shared/function-handler.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { CheckUsernameSchema } from '../_shared/schemas/user.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { addVersionHeaders } from '../_shared/versioning.ts';
import { isReservedUsername } from '../_shared/reserved-usernames.ts';

async function handleCheckUsername(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const { username } = body;
  const responseHeaders = {
    ...corsHeaders,
    ...addVersionHeaders(),
    'Content-Type': 'application/json',
  };

  // Diagnostic logging to verify auth context
  const authHeader = (req as unknown as Request).headers.get('Authorization');
  await logger.info(
    'Checking username availability',
    { 
      user_id: user.id, 
      username,
      has_auth_header: !!authHeader,
      auth_header_length: authHeader?.length || 0,
    },
    traceContext,
  );

  try {
    // Check if username is reserved (word-boundary aware, case-insensitive)
    if (isReservedUsername(username)) {
      await logger.info(
        'Username is reserved',
        {
          user_id: user.id,
          username,
        },
        traceContext,
      );

      return {
        available: false,
        message: 'This username is not available.',
      };
    }

    // Check case-insensitive uniqueness in database using RPC function
    const { data: rpcData, error: rpcError } = await supabaseClient.rpc(
      'check_username_available',
      {
        p_username: username,
        p_exclude_user_id: user.id,
      },
    );

    if (rpcError) {
      throw handleDbError(rpcError);
    }

    const isAvailable = rpcData === true;

    await logger.info(
      'Username availability check complete',
      {
        user_id: user.id,
        username,
        is_available: isAvailable,
      },
      traceContext,
    );

    return {
      available: isAvailable,
      ...(isAvailable ? {} : { message: 'This username is not available.' }),
    };
  } catch (error) {
    await logger.error(
      'Username availability check failed',
      {
        user_id: user.id,
        username,
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : { message: String(error) },
      },
      traceContext,
    );

    // Check if error is from database trigger (case-insensitive uniqueness violation)
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('USERNAME_DUPLICATE') || errorMessage.includes('already exists')) {
      return {
        available: false,
        message: 'This username is not available.',
      };
    }

    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      {
        status: 500,
        headers: responseHeaders,
      },
    );
  }
}

serve(
  createAuthenticatedHandler(handleCheckUsername, {
    rateLimitName: 'check-username',
    schema: CheckUsernameSchema,
    // No task limit check needed for this operation
  }),
);
