import { Expo } from 'npm:expo-server-sdk@3.7.0';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { withTimeout, DEFAULT_TIMEOUTS } from './timeout.ts';
import { retryWithBackoff } from './retry.ts';
import { circuitBreakers } from './circuit-breaker.ts';
import {
  shouldUseFallback,
  queueNotificationForLater,
} from './fallback-handler.ts';
import { trackQuotaUsage, getQuotaStatus } from './quota-monitor.ts';

// Define a clear return type for the function
export interface NotificationResult {
  success: boolean;
  sentCount: number;
  failureCount: number;
  invalidTokens: string[];
  ticketIds: string[];
}

/**
 * Check if an Expo push notification error is retryable
 */
function _isRetryableExpoError(error: unknown): boolean {
  const err = error as { message?: string; statusCode?: number; code?: string };

  // Don't retry permanent errors
  if (err.message?.includes('InvalidCredentials')) return false;
  if (err.message?.includes('DeviceNotRegistered')) return false;
  if (err.message?.includes('MessageTooBig')) return false;
  if (err.message?.includes('InvalidRegistration')) return false;
  if (err.message?.includes('MismatchSenderId')) return false;

  // Don't retry client errors (4xx except 429)
  if (
    err.statusCode &&
    err.statusCode >= 400 &&
    err.statusCode < 500 &&
    err.statusCode !== 429
  ) {
    return false;
  }

  // Retry network errors, timeouts, and 5xx errors
  return true;
}

export async function sendPushNotification(
  supabaseAdmin: SupabaseClient,
  pushTokens: string[],
  title: string,
  body: string,
  data?: object,
  options?: {
    priority?: 'default' | 'normal' | 'high';
    categoryId?: string;
    badge?: number;
    userId?: string; // Optional: for queueing notifications when quota exhausted
  },
): Promise<NotificationResult> {
  const expo = new Expo();
  const messages = [];
  const invalidTokens: string[] = [];
  const ticketIds: string[] = [];
  let sentCount = 0;
  let failureCount = 0;

  // Check quota before sending
  const quotaStatus = await getQuotaStatus(supabaseAdmin, 'expo_push');
  const useFallback = await shouldUseFallback(
    supabaseAdmin,
    'expo_push',
    pushTokens.length,
  );

  if (useFallback) {
    console.warn(
      `Expo push quota nearly exhausted: ${quotaStatus.remaining} remaining, ${pushTokens.length} needed. Queueing notifications for later delivery.`,
    );

    // Queue all notifications for later if userId is provided
    if (options?.userId) {
      for (const token of pushTokens) {
        await queueNotificationForLater(
          supabaseAdmin,
          options.userId,
          token,
          title,
          body,
          data,
          options.priority || 'normal',
        );
      }
    }

    return {
      success: false,
      sentCount: 0,
      failureCount: pushTokens.length,
      invalidTokens: [],
      ticketIds: [],
    };
  }

  for (const pushToken of pushTokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.warn(
        `Push token ${pushToken} is not a valid Expo push token. Adding to cleanup.`,
      );
      invalidTokens.push(pushToken);
      continue;
    }
    messages.push({
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
      priority: options?.priority || 'high',
      categoryId: options?.categoryId,
      badge: options?.badge,
    });
  }

  if (messages.length === 0) {
    // Clean up any tokens that were invalid from the start
    if (invalidTokens.length > 0) {
      await cleanupInvalidTokens(supabaseAdmin, invalidTokens);
    }
    return {
      success: true,
      sentCount: 0,
      failureCount: 0,
      invalidTokens,
      ticketIds: [],
    };
  }

  const chunks = expo.chunkPushNotifications(messages);

  try {
    for (const chunk of chunks) {
      // Use circuit breaker, retry, and timeout for Expo API calls
      const tickets = await circuitBreakers.expo.execute(async () => {
        return await retryWithBackoff(
          async () => {
            return await withTimeout(
              expo.sendPushNotificationsAsync(chunk),
              DEFAULT_TIMEOUTS.expoPush,
              'Expo push notification request timed out',
            );
          },
          3, // maxRetries
          1000, // baseDelay (1 second)
          30000, // maxDelay (30 seconds)
        );
      });

      console.log('Sent notification chunk, received tickets:', tickets);

      tickets.forEach((ticket, index) => {
        const originalMessage = chunk[index];

        if (ticket.status === 'ok') {
          sentCount++;
          ticketIds.push(ticket.id);
        } else if (ticket.status === 'error') {
          failureCount++;
          console.error(
            `Error sending notification to ${originalMessage.to}: ${ticket.message}`,
          );

          // Check for permanent errors that indicate invalid tokens
          const errorCode = ticket.details?.error;
          const permanentErrors = [
            'DeviceNotRegistered',
            'InvalidCredentials',
            'InvalidRegistration',
            'MismatchSenderId',
            'MessageTooBig',
          ];

          if (errorCode && permanentErrors.includes(errorCode)) {
            // This token is permanently invalid and should be removed
            invalidTokens.push(originalMessage.to as string);
          }
        }
      });
    }
  } catch (error) {
    const err = error as { message?: string };

    // Check if circuit breaker is open
    if (err.message?.includes('Circuit breaker')) {
      console.error(
        'Expo push service is temporarily unavailable (circuit breaker OPEN):',
        err.message,
      );
      // Could queue notifications here for later delivery
    } else {
      console.error('Critical error sending push notification chunk:', error);
    }

    // In case of a total failure, we can't know which tokens are bad, so we return a total failure
    return {
      success: false,
      sentCount: 0,
      failureCount: messages.length,
      invalidTokens: [],
      ticketIds: [],
    };
  }

  // After processing all chunks, clean up the invalid tokens from the database
  if (invalidTokens.length > 0) {
    await cleanupInvalidTokens(supabaseAdmin, invalidTokens);
  }

  // Track quota usage for successful sends
  if (sentCount > 0) {
    await trackQuotaUsage(supabaseAdmin, 'expo_push', sentCount);

    // Record cost for successful notifications
    try {
      const { recordApiCost, DEFAULT_COSTS } = await import(
        './cost-tracker.ts'
      );
      await recordApiCost(supabaseAdmin, {
        serviceName: 'expo_push',
        operationType: 'push_notification',
        quantity: sentCount,
        unitCost: DEFAULT_COSTS.expo_push.push_notification,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to record cost for push notifications:', error);
      // Don't fail the operation if cost tracking fails
    }
  }

  return {
    success: failureCount === 0,
    sentCount,
    failureCount,
    invalidTokens,
    ticketIds,
  };
}

async function cleanupInvalidTokens(
  supabaseAdmin: SupabaseClient,
  tokens: string[],
) {
  if (tokens.length === 0) return;

  console.log(`Cleaning up ${tokens.length} invalid push tokens...`);

  // Also track failure count for tokens that fail repeatedly
  const { error: updateError } = await supabaseAdmin
    .from('user_devices')
    .update({
      updated_at: new Date().toISOString(),
      // We could add a failure_count column later if needed
    })
    .in('push_token', tokens);

  if (updateError) {
    console.error('Failed to update token metadata:', updateError);
  }

  // Delete invalid tokens
  const { error } = await supabaseAdmin
    .from('user_devices')
    .delete()
    .in('push_token', tokens);

  if (error) {
    console.error('Failed to clean up invalid push tokens:', error);
  } else {
    console.log(`Successfully cleaned up ${tokens.length} invalid tokens.`);
  }
}
