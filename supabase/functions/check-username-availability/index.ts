import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
} from '../_shared/function-handler.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { CheckUsernameSchema } from '../_shared/schemas/user.ts';

async function handleCheckUsername(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const { username } = body;

  await logger.info(
    'Checking username availability',
    { user_id: user.id, username },
    traceContext,
  );

  const { data, error } = await supabaseClient
    .from('users')
    .select('id')
    .eq('username', username)
    .neq('id', user.id); // Exclude the current user from the check

  if (error) {
    throw handleDbError(error);
  }

  const isAvailable = data.length === 0;

  await logger.info(
    'Username availability check complete',
    {
      user_id: user.id,
      username,
      is_available: isAvailable,
    },
    traceContext,
  );

  return { isAvailable };
}

serve(
  createAuthenticatedHandler(handleCheckUsername, {
    rateLimitName: 'check-username',
    schema: CheckUsernameSchema,
    // No task limit check needed for this operation
  }),
);
