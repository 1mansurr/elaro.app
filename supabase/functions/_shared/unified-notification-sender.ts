/**
 * Unified notification sender that handles both push and email notifications
 * Respects user preferences for each channel
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { sendPushNotification } from './send-push-notification.ts';
import { logger } from './logging.ts';
import {
  isWithinQuietHours,
  getUserNotificationPreferences,
  canSendNotification,
} from './notification-helpers.ts';

export interface UnifiedNotificationParams {
  userId: string;
  notificationType: string;
  title: string;
  body: string;
  emailSubject?: string;
  emailContent?: string;
  data?: object;
  options?: {
    priority?: 'default' | 'normal' | 'high';
    categoryId?: string;
    badge?: number;
  };
  // Optional: Pass preferences to avoid refetch (optimization)
  preferences?: Awaited<ReturnType<typeof getUserNotificationPreferences>>;
}

export interface UnifiedNotificationResult {
  pushSent: boolean;
  emailSent: boolean;
  pushResult?: {
    success: boolean;
    sentCount: number;
    failureCount: number;
  };
  emailResult?: {
    success: boolean;
    messageId?: string;
  };
}

/**
 * Send notification via both push and email channels (respecting preferences)
 */
export async function sendUnifiedNotification(
  supabaseAdmin: SupabaseClient,
  params: UnifiedNotificationParams,
): Promise<UnifiedNotificationResult> {
  const {
    userId,
    notificationType,
    title,
    body,
    emailSubject,
    emailContent,
    data,
    options,
  } = params;

  // Get full user preferences (including timezone and channel preferences) in one call
  // Use provided preferences if available to avoid refetch
  const fullPrefs =
    params.preferences ||
    (await getUserNotificationPreferences(supabaseAdmin, userId));

  if (!fullPrefs) {
    await logger.error('Error fetching notification preferences', {
      user_id: userId,
    });
    return { pushSent: false, emailSent: false };
  }

  // Check master toggle
  if (fullPrefs.master_toggle === false || fullPrefs.do_not_disturb === true) {
    await logger.info('Notifications disabled for user', { user_id: userId });
    return { pushSent: false, emailSent: false };
  }

  // Check type-specific preference and quiet hours (canSendNotification now includes quiet hours check)
  if (!canSendNotification(fullPrefs, notificationType)) {
    await logger.info('Notification blocked by preferences or quiet hours', {
      user_id: userId,
      notification_type: notificationType,
    });
    // Skip notification (could enhance to queue for later)
    return { pushSent: false, emailSent: false };
  }

  // Channel preferences are now included in getUserNotificationPreferences
  const channelPrefs = {
    push_notifications: fullPrefs.push_notifications,
    email_notifications: fullPrefs.email_notifications,
  };

  const results: UnifiedNotificationResult = {
    pushSent: false,
    emailSent: false,
  };

  // Send push notification if enabled
  if (channelPrefs?.push_notifications !== false) {
    try {
      // Get push tokens
      const { data: devices } = await supabaseAdmin
        .from('user_devices')
        .select('push_token')
        .eq('user_id', userId);

      const pushTokens = devices?.map(d => d.push_token).filter(Boolean) || [];

      if (pushTokens.length > 0) {
        const pushResult = await sendPushNotification(
          supabaseAdmin,
          pushTokens,
          title,
          body,
          data,
          options,
        );

        results.pushSent = pushResult.success;
        results.pushResult = {
          success: pushResult.success,
          sentCount: pushResult.sentCount,
          failureCount: pushResult.failureCount,
        };
      }
    } catch (error) {
      await logger.error('Error sending push notification', {
        user_id: userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Send email notification if enabled
  if (
    channelPrefs?.email_notifications !== false &&
    emailSubject &&
    emailContent
  ) {
    try {
      // Get user email
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('email, first_name')
        .eq('id', userId)
        .single();

      if (user?.email) {
        // Use Resend directly via HTTP call to email-system function
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

        try {
          const response = await fetch(
            `${supabaseUrl}/functions/v1/email-system`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                action: 'send-custom',
                to: user.email,
                subject: emailSubject,
                template: 'custom',
                data: {
                  content: emailContent,
                  firstName: user.first_name || 'User',
                  notificationType,
                  ...data,
                },
              }),
            },
          );

          if (response.ok) {
            const emailResult = await response.json();
            results.emailSent = true;
            results.emailResult = {
              success: true,
              messageId: emailResult.message_id,
            };
          } else {
            const errorData = await response.text();
            await logger.error('Error sending email notification', {
              user_id: userId,
              error: errorData,
            });
          }
        } catch (fetchError) {
          await logger.error('Error calling email-system function', {
            user_id: userId,
            error:
              fetchError instanceof Error
                ? fetchError.message
                : String(fetchError),
          });
        }
      }
    } catch (error) {
      await logger.error('Error sending email notification', {
        user_id: userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Log delivery
  await supabaseAdmin.from('notification_deliveries').insert({
    user_id: userId,
    notification_type: notificationType,
    title,
    body,
    sent_at: new Date().toISOString(),
    metadata: {
      ...data,
      push_sent: results.pushSent,
      email_sent: results.emailSent,
    },
    expo_status: results.pushSent ? 'ok' : null,
  });

  return results;
}
