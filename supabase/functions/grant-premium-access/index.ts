// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
} from '../_shared/function-handler.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { z } from 'zod';

// Optional schema - user can optionally pass a custom expiration date
const GrantPremiumSchema = z.object({
  expirationDate: z
    .string()
    .datetime('Invalid expiration date format')
    .optional(),
});

async function handleGrantPremium(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);

  await logger.info(
    'Granting premium access',
    { user_id: user.id },
    traceContext,
  );

  // Use provided expiration date or default to 100 years from now
  const expirationDate = body.expirationDate && typeof body.expirationDate === 'string'
    ? new Date(body.expirationDate).toISOString()
    : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error: updateError } = await supabaseClient
    .from('users')
    .update({
      subscription_tier: 'oddity',
      subscription_status: 'active',
      subscription_expires_at: expirationDate,
    })
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) throw handleDbError(updateError);

  await logger.info(
    'Successfully granted premium access',
    { user_id: user.id, expiration_date: expirationDate },
    traceContext,
  );

  // Maintain backward compatibility with existing response format
  return { message: 'Premium access granted successfully.', user: data };
}

serve(
  createAuthenticatedHandler(handleGrantPremium, {
    rateLimitName: 'grant-premium-access',
    schema: GrantPremiumSchema,
    requireIdempotency: true,
  }),
);
