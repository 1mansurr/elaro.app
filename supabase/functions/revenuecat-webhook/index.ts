// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createWebhookHandler } from '../_shared/function-handler.ts';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { sendPushNotification } from '../_shared/send-push-notification.ts';
import { getUserNotificationPreferences } from '../_shared/notification-helpers.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';

interface RevenueCatWebhookPayload {
  api_version: string;
  event: {
    id: string;
    type: string;
    app_user_id: string;
    original_app_user_id: string;
    product_id: string;
    period_type: string;
    purchased_at_ms: number;
    expiration_at_ms?: number;
    environment: string;
    entitlement_id?: string;
    entitlement_ids?: string[];
    presented_offering_id?: string;
    transaction_id: string;
    original_transaction_id: string;
    is_family_share: boolean;
    country_code: string;
    app_id: string;
    offer_code?: string;
    currency: string;
    price: number;
    price_in_purchased_currency: number;
    subscriber_attributes: Record<string, unknown>;
    store: string;
    takehome_percentage: number;
    commission_percentage: number;
  };
}

async function handleRevenueCatWebhook(
  supabaseAdmin: SupabaseClient,
  payload: RevenueCatWebhookPayload,
  eventType: string,
) {
  const traceContext = extractTraceContext(
    new Request('https://webhook.internal'),
  );

  await logger.info(
    'Received RevenueCat webhook event',
    {
      event_type: eventType,
      user_id: payload.event.app_user_id,
      product_id: payload.event.product_id,
      entitlements: payload.event.entitlement_ids,
    },
    traceContext,
  );

  const { app_user_id, product_id, expiration_at_ms, entitlement_ids } =
    payload.event;

  // Validate required fields
  if (!app_user_id) {
    await logger.error(
      'No app_user_id in RevenueCat webhook',
      {},
      traceContext,
    );
    return { status: 'error', message: 'Missing app_user_id' };
  }

  try {
    // Determine subscription tier based on entitlements
    let subscriptionTier = 'free';
    let expirationDate: Date | null = null;

    // Check if user has oddity entitlement
    const hasOddityEntitlement =
      entitlement_ids?.includes('oddity') ||
      payload.event.entitlement_id === 'oddity';

    if (hasOddityEntitlement) {
      subscriptionTier = 'oddity';

      // Set expiration date if provided
      if (expiration_at_ms) {
        expirationDate = new Date(expiration_at_ms);
      } else {
        // Fallback: calculate expiration based on product type (monthly subscription)
        expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      }

      await logger.info(
        'User has active Oddity subscription',
        {
          user_id: app_user_id,
          expires_at: expirationDate?.toISOString(),
        },
        traceContext,
      );
    }

    // Handle different event types
    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE': {
        await logger.info(
          'Processing subscription event',
          {
            event_type: eventType,
            user_id: app_user_id,
            product_id,
          },
          traceContext,
        );

        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            subscription_tier: subscriptionTier,
            subscription_status:
              subscriptionTier === 'oddity' ? 'active' : null,
            subscription_expires_at: expirationDate?.toISOString() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', app_user_id);

        if (updateError) {
          await logger.error(
            'Failed to update subscription',
            {
              user_id: app_user_id,
              error: updateError.message,
            },
            traceContext,
          );
          throw handleDbError(updateError);
        }

        await logger.info(
          'Subscription successfully updated',
          {
            user_id: app_user_id,
            tier: subscriptionTier,
          },
          traceContext,
        );

        return {
          status: 'success',
          message: 'Subscription updated successfully',
          subscriptionTier,
          expirationDate: expirationDate?.toISOString(),
        };
      }

      case 'CANCELLATION':
      case 'EXPIRATION':
      case 'BILLING_ISSUE': {
        await logger.info(
          'Processing subscription cancellation/expiration',
          {
            event_type: eventType,
            user_id: app_user_id,
          },
          traceContext,
        );

        // Determine appropriate subscription_status based on event type
        const subscriptionStatus =
          eventType === 'BILLING_ISSUE'
            ? 'past_due'
            : eventType === 'CANCELLATION'
              ? 'canceled'
              : 'expired';

        const { error: cancelError } = await supabaseAdmin
          .from('users')
          .update({
            subscription_tier: 'free',
            subscription_status: subscriptionStatus,
            subscription_expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', app_user_id);

        if (cancelError) {
          await logger.error(
            'Failed to cancel subscription',
            {
              user_id: app_user_id,
              error: cancelError.message,
            },
            traceContext,
          );
          throw handleDbError(cancelError);
        }

        await logger.info(
          'User subscription cancelled/expired',
          { user_id: app_user_id },
          traceContext,
        );

        // Send push notification to user about subscription ending
        try {
          const { data: devices } = await supabaseAdmin
            .from('user_devices')
            .select('push_token')
            .eq('user_id', app_user_id);

          if (devices && devices.length > 0) {
            const tokens = devices.map((d: { push_token?: string }) => d.push_token).filter(Boolean);

            // Check if notifications are enabled (critical notifications bypass quiet hours but respect master toggle)
            const prefs = await getUserNotificationPreferences(
              supabaseAdmin,
              app_user_id,
            );
            if (
              prefs?.master_toggle === false ||
              prefs?.do_not_disturb === true
            ) {
              await logger.info(
                'Subscription notification skipped - user disabled notifications',
                {
                  user_id: app_user_id,
                },
                traceContext,
              );
              // Skip sending notification but continue processing
            } else {
              // Dynamic message based on event type
              const message =
                eventType === 'BILLING_ISSUE'
                  ? 'Your subscription payment failed. Become an Oddity to restore access to all features.'
                  : 'Your Oddity subscription has ended. Become an Oddity to restore access.';

              await sendPushNotification(
                supabaseAdmin,
                tokens,
                'Subscription Ended',
                message,
                { type: 'subscription_ended', userId: app_user_id },
              );

              await logger.info(
                'Push notification sent about subscription ending',
                { user_id: app_user_id },
                traceContext,
              );
            }
          }
        } catch (notificationError: unknown) {
          // Log error but don't fail the webhook
          await logger.error(
            'Failed to send push notification',
            {
              user_id: app_user_id,
              error:
                notificationError instanceof Error
                  ? notificationError.message
                  : String(notificationError),
            },
            traceContext,
          );
        }

        return {
          status: 'success',
          message: 'Subscription cancelled successfully',
        };
      }

      case 'NON_RENEWING_PURCHASE':
        await logger.info(
          'Processing non-renewing purchase',
          { user_id: app_user_id, product_id },
          traceContext,
        );
        return {
          status: 'acknowledged',
          message: 'Non-renewing purchase acknowledged',
        };

      case 'TRANSFER':
        await logger.info(
          'Processing subscription transfer',
          { user_id: app_user_id },
          traceContext,
        );
        return {
          status: 'acknowledged',
          message: 'Subscription transfer acknowledged',
        };

      default:
        await logger.info(
          'Unhandled RevenueCat event type',
          { event_type: eventType },
          traceContext,
        );
        return {
          status: 'acknowledged',
          message: 'Event acknowledged but not processed',
        };
    }
  } catch (error: unknown) {
    await logger.error(
      'Error processing RevenueCat webhook',
      {
        user_id: app_user_id,
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );
    throw error;
  }
}

// Initialize webhook handler with proper configuration
serve(
  createWebhookHandler(
    async (
      supabaseAdmin: SupabaseClient,
      payload: Record<string, unknown>,
      eventType: string,
    ) => {
      // Cast payload to RevenueCatWebhookPayload (convert through unknown first)
      const typedPayload = payload as unknown as RevenueCatWebhookPayload;
      return await handleRevenueCatWebhook(supabaseAdmin, typedPayload, eventType);
    },
    {
      secretKeyEnvVar: 'REVENUECAT_AUTH_HEADER_SECRET',
      headerName: 'authorization',
    },
  ),
);
