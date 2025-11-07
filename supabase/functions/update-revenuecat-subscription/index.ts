import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
  AppError,
} from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { CustomerInfo } from 'https://esm.sh/react-native-purchases@7.0.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const UpdateSubscriptionSchema = z.object({
  customerInfo: z.any(), // CustomerInfo is a complex type from external library
  userId: z.string().uuid('Invalid user ID format').optional(),
});

async function handleUpdateSubscription(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const { customerInfo, userId } = body as {
    customerInfo: CustomerInfo;
    userId?: string;
  };

  // Use the userId from the request body if provided, otherwise use the authenticated user
  const targetUserId = userId || user.id;

  if (!customerInfo) {
    throw new AppError(
      'Customer info is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  await logger.info(
    'Updating subscription',
    { user_id: targetUserId },
    traceContext,
  );

  try {
    // Determine subscription tier based on active entitlements
    let subscriptionTier = 'free';
    let expirationDate: string | null = null;

    // Check if user has oddity entitlement
    if (customerInfo.entitlements.active['oddity']) {
      subscriptionTier = 'oddity';
      const oddityEntitlement = customerInfo.entitlements.active['oddity'];
      expirationDate = oddityEntitlement.expirationDate;
    }

    // Update user subscription in database
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        subscription_tier: subscriptionTier,
        subscription_expires_at: expirationDate,
      })
      .eq('id', targetUserId);

    if (updateError) {
      throw handleDbError(updateError);
    }

    await logger.info(
      'Successfully updated subscription',
      { user_id: targetUserId, tier: subscriptionTier },
      traceContext,
    );

    return {
      success: true,
      message: 'Subscription updated successfully',
      subscriptionTier,
      expirationDate,
    };
  } catch (error: unknown) {
    await logger.error(
      'Error updating subscription',
      {
        user_id: targetUserId,
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );
    throw error;
  }
}

serve(
  createAuthenticatedHandler(handleUpdateSubscription, {
    rateLimitName: 'update-revenuecat-subscription',
    schema: UpdateSubscriptionSchema,
    requireIdempotency: true,
  }),
);
