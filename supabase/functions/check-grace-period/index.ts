// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { sendPushNotification } from '../_shared/send-push-notification.ts';
import { getUserNotificationPreferences } from '../_shared/notification-helpers.ts';
import { retryFetch } from '../_shared/retry.ts';
import { circuitBreakers } from '../_shared/circuit-breaker.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function handleGracePeriodCheck(supabaseAdmin: SupabaseClient) {
  const traceContext = extractTraceContext(
    new Request('https://cron.internal'),
  );

  await logger.info('Checking for users in grace period', {}, traceContext);

  try {
    const { data: activeUsers, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, subscription_expires_at')
      .eq('subscription_tier', 'oddity')
      .not('subscription_expires_at', 'is', null);

    if (fetchError) throw handleDbError(fetchError);

    let notifiedCount = 0;
    for (const user of activeUsers || []) {
      try {
        const revenueCatApiKey = Deno.env.get('REVENUECAT_API_KEY');

        // Use circuit breaker + retry for resilient external API call
        const response = await circuitBreakers.revenueCat.execute(async () => {
          return await retryFetch(
            `https://api.revenuecat.com/v1/subscribers/${user.id}`,
            {
              headers: { Authorization: `Bearer ${revenueCatApiKey}` },
            },
            3, // max 3 retries
            10000, // 10 second timeout
          );
        });

        if (!response.ok) {
          await logger.error(
            'Failed to fetch RevenueCat data',
            {
              user_id: user.id,
              status: response.status,
            },
            traceContext,
          );
          continue;
        }

        const rcData = await response.json();
        const oddityEntitlement = rcData?.subscriber?.entitlements?.oddity;

        if (oddityEntitlement?.is_in_grace_period) {
          const { data: devices } = await supabaseAdmin
            .from('user_devices')
            .select('push_token')
            .eq('user_id', user.id);
          if (devices && devices.length > 0) {
            const tokens = devices
              .map((d: { push_token?: string }) => d.push_token)
              .filter(Boolean);

            // Check if notifications are enabled (critical notifications bypass quiet hours but respect master toggle)
            const prefs = await getUserNotificationPreferences(
              supabaseAdmin,
              user.id,
            );
            if (
              prefs?.master_toggle === false ||
              prefs?.do_not_disturb === true
            ) {
              await logger.info(
                'Grace period notification skipped - user disabled notifications',
                {
                  user_id: user.id,
                },
                traceContext,
              );
              continue; // Skip this user
            }

            const expirationDate = new Date(
              oddityEntitlement.expires_date,
            ).toLocaleDateString();
            await sendPushNotification(
              supabaseAdmin,
              tokens,
              '⚠️ Payment Issue',
              `Your ELARO subscription payment failed. Please update your payment method by ${expirationDate} to keep your Oddity access.`,
              { type: 'grace_period_warning', userId: user.id },
            );
            notifiedCount++;
            await logger.info(
              'Sent grace period notification',
              { user_id: user.id },
              traceContext,
            );
          }
        }
      } catch (userError: unknown) {
        // Log error for this user but continue with others
        await logger.error(
          'Error processing user',
          {
            user_id: user.id,
            error:
              userError instanceof Error
                ? userError.message
                : String(userError),
          },
          traceContext,
        );
      }
    }

    await logger.info(
      'Grace period check completed',
      { notified_count: notifiedCount },
      traceContext,
    );
    return {
      success: true,
      message: `Grace period check completed. Notified ${notifiedCount} users.`,
    };
  } catch (error: unknown) {
    await logger.error(
      'Error in grace period check',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );
    throw error;
  }
}

serve(
  createScheduledHandler(handleGracePeriodCheck, {
    requireSecret: true,
    secretEnvVar: 'CRON_SECRET',
  }),
);
