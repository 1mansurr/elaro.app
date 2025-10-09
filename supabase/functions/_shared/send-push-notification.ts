// FILE: supabase/functions/_shared/send-push-notification.ts
// ACTION: Create this new shared helper function.

import { Expo } from 'https://deno.land/x/expo_server_sdk/mod.ts';

export async function sendPushNotification(pushTokens: string[], title: string, body: string, data?: object) {
  const expo = new Expo();
  const messages = [];

  for (const pushToken of pushTokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.warn(`Push token ${pushToken} is not a valid Expo push token`);
      continue;
    }
    messages.push({
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data || {},
    });
  }

  if (messages.length > 0) {
    try {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
    } catch (error) {
      console.error('Error sending push notifications:', error);
      // We don't re-throw here to avoid stopping the main loop.
    }
  }
}
