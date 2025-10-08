// FILE: supabase/functions/send-push-notification/index.ts
// Create this new file and its parent directory.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import Expo from "expo-server-sdk";
import { checkRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

const expo = new Expo( );

// This function assumes you have a 'profiles' table with 'id' (matching user_id)
// and 'push_token' columns.
async function sendPushNotification(userId: string, title: string, body: string, data: object) {
  // Create a Supabase client with the service role key to bypass RLS
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Get the user's push token from the database
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("push_token")
    .eq("id", userId)
    .single();

  if (error || !profile || !profile.push_token) {
    console.error(`No push token found for user ${userId}`, error);
    return { error: `No push token found for user ${userId}` };
  }

  const pushToken = profile.push_token;

  // 2. Check if the token is a valid Expo push token
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return { error: `Invalid push token` };
  }

  // 3. Construct the message
  const message = {
    to: pushToken,
    sound: "default" as const,
    title: title,
    body: body,
    data: data,
  };

  // 4. Send the notification
  try {
    const tickets = await expo.sendPushNotificationsAsync([message]);
    console.log("Push notification sent, ticket:", tickets[0]);
    // You can add more logic here to handle receipts and errors from Expo
    return { success: true, ticket: tickets[0] };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { error: "Failed to send push notification" };
  }
}

serve(async (req) => {
  // This function is designed to be called internally, so we add security.
  // A real implementation might use a specific auth key.
  const authHeader = req.headers.get("Authorization")!;
  if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { userId, title, body, data } = await req.json();

  // Apply rate limiting check for the user
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  try {
    await checkRateLimit(supabaseClient, userId, 'send-push-notification');
  } catch (error) {
    if (error instanceof RateLimitError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error('An unexpected error occurred during rate limit check:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!userId || !title || !body) {
    return new Response("Missing required parameters: userId, title, body", { status: 400 });
  }

  const result = await sendPushNotification(userId, title, body, data || {});

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
    status: result.error ? 500 : 200,
  });
});
