import { Expo } from 'npm:expo-server-sdk@3.7.0';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define a clear return type for the function
export interface NotificationResult {
  success: boolean;
  sentCount: number;
  failureCount: number;
  invalidTokens: string[];
  ticketIds: string[];
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
  }
 ): Promise<NotificationResult> {
  const expo = new Expo();
  const messages = [];
  const invalidTokens: string[] = [];
  const ticketIds: string[] = [];
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
    return { success: true, sentCount: 0, failureCount: 0, invalidTokens, ticketIds: [] };
  }

  const chunks = expo.chunkPushNotifications(messages);

  try {
    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      console.log('Sent notification chunk, received tickets:', tickets);

      tickets.forEach((ticket, index) => {
        const originalMessage = chunk[index];
        
        if (ticket.status === 'ok') {
          sentCount++;
          ticketIds.push(ticket.id);
        } else if (ticket.status === 'error') {
          failureCount++;
          console.error(`Error sending notification to ${originalMessage.to}: ${ticket.message}`);
          
          if (ticket.details?.error === 'DeviceNotRegistered') {
            // This token is invalid and should be removed
            invalidTokens.push(originalMessage.to as string);
          }
        }
      });
    }
  } catch (error) {
    console.error('Critical error sending push notification chunk:', error);
    // In case of a total failure, we can't know which tokens are bad, so we return a total failure
    return { success: false, sentCount: 0, failureCount: messages.length, invalidTokens: [], ticketIds: [] };
  }

  // After processing all chunks, clean up the invalid tokens from the database
  if (invalidTokens.length > 0) {
    await cleanupInvalidTokens(supabaseAdmin, invalidTokens);
  }

  return {
    success: failureCount === 0,
    sentCount,
    failureCount,
    invalidTokens,
    ticketIds,
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