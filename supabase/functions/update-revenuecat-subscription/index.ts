// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
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
import { z } from 'zod';

// Minimal type definition for CustomerInfo (avoiding react-native-purchases dependency)
interface CustomerInfo {
  entitlements: {
    active: {
      [key: string]: {
        expirationDate: string | null;
      };
    };
  };
}

const UpdateSubscriptionSchema = z.object({
  customerInfo: z.any(), // CustomerInfo is a complex type from external library
  userId: z.string().uuid('Invalid user ID format').optional(),
});

async function handleUpdateSubscription(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  // PASS 2: Validate body is object before accessing properties
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(
      'Request body must be an object',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const bodyObj = body as { customerInfo?: unknown; userId?: unknown };
  const { customerInfo, userId } = bodyObj;

  // PASS 2: Validate userId if provided (never trust client-provided IDs for non-admin operations)
  let targetUserId = user.id; // Default to authenticated user
  if (userId !== undefined && userId !== null) {
    // Validate format
    if (typeof userId !== 'string') {
      throw new AppError(
        'userId must be a string',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'userId', message: 'userId must be a string type' },
      );
    }
    // Validate UUID format
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId,
      )
    ) {
      throw new AppError(
        'Invalid userId format',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'userId', message: 'userId must be a valid UUID' },
      );
    }
    // CRITICAL: Users can only update their own subscription (unless admin)
    // For now, enforce that userId must match authenticated user
    if (userId !== user.id) {
      throw new AppError(
        'You can only update your own subscription',
        403,
        ERROR_CODES.FORBIDDEN,
      );
    }
    targetUserId = userId;
  }

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

    // Type guard for CustomerInfo structure
    const customerInfoTyped = customerInfo as CustomerInfo;
    if (customerInfoTyped?.entitlements?.active?.['oddity']) {
      subscriptionTier = 'oddity';
      const oddityEntitlement = customerInfoTyped.entitlements.active['oddity'];
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
