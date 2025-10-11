import { Expo } from 'npm:expo-server-sdk@3.7.0';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define a clear return type for the function
export interface NotificationResult {
  success: boolean;
  sentCount: number;
  failureCount: number;
  invalidTokens: string[];
}

export async function sendPushNotification(
  supabaseAdmin: SupabaseClient,
  pushTokens: string[],
  title: string,
  body: string,
  data?: object
 ): Promise<NotificationResult> {
  const expo = new Expo();
  const messages = [];
  const invalidTokens: string[] = [];
  let sentCount = 0;
  let failureCount = 0;

  for (const pushToken of pushTokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.warn(`Push token ${pushToken} is not a valid Expo push token. Adding to cleanup.`);
      invalidTokens.push(pushToken);
      continue;
    }
    messages.push({
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    });
  }

  if (messages.length === 0) {
    // Clean up any tokens that were invalid from the start
    if (invalidTokens.length > 0) {
      await cleanupInvalidTokens(supabaseAdmin, invalidTokens);
    }
    return { success: true, sentCount: 0, failureCount: 0, invalidTokens };
  }

  const chunks = expo.chunkPushNotifications(messages);

  try {
    for (const chunk of chunks) {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      console.log('Sent notification chunk, received receipts:', receipts);

      receipts.forEach((receipt, index) => {
        const originalMessage = chunk[index];
        if (receipt.status === 'ok') {
          sentCount++;
        } else if (receipt.status === 'error') {
          failureCount++;
          console.error(`Error sending notification to ${originalMessage.to}: ${receipt.message}`);
          if (receipt.details?.error === 'DeviceNotRegistered') {
            // This token is invalid and should be removed.
            invalidTokens.push(originalMessage.to as string);
          }
        }
      });
    }
  } catch (error) {
    console.error('Critical error sending push notification chunk:', error);
    // In case of a total failure, we can't know which tokens are bad, so we return a total failure.
    return { success: false, sentCount: 0, failureCount: messages.length, invalidTokens: [] };
  }

  // After processing all chunks, clean up the invalid tokens from the database.
  if (invalidTokens.length > 0) {
    await cleanupInvalidTokens(supabaseAdmin, invalidTokens);
  }

  return {
    success: failureCount === 0,
    sentCount,
    failureCount,
    invalidTokens,
  };
}

async function cleanupInvalidTokens(supabaseAdmin: SupabaseClient, tokens: string[]) {
  console.log(`Cleaning up ${tokens.length} invalid push tokens...`);
  const { error } = await supabaseAdmin
    .from('user_devices')
    .delete()
    .in('push_token', tokens);

  if (error) {
    console.error('Failed to clean up invalid push tokens:', error);
  } else {
    console.log('Successfully cleaned up invalid tokens.');
  }
}