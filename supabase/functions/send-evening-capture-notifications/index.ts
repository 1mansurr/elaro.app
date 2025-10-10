import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { sendPushNotification } from '../_shared/send-push-notification.ts';

async function handleEveningCapture(supabaseAdmin: SupabaseClient) {
  console.log('--- Starting Evening Capture Notifications Job ---');
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, timezone, evening_capture_enabled, user_devices(push_token)')
    .eq('evening_capture_enabled', true);

  if (error) throw error;
  if (!users || users.length === 0) return { message: 'No users to notify.' };

  let notifiedCount = 0;
  for (const user of users) {
    const userDevices = user.user_devices || [];
    if (userDevices.length === 0) continue;

    const localHour = parseInt(new Date().toLocaleTimeString('en-US', { timeZone: user.timezone || 'UTC', hour: '2-digit', hour12: false }));
    if (localHour === 19) { // 7 PM
      const pushTokens = userDevices.map((d: any) => d.push_token);
      await sendPushNotification(pushTokens, "Don't Forget!", "Did you get any new assignments today? Add them to Elaro now.");
      notifiedCount++;
    }
  }
  
  const result = { processedUsers: users.length, notificationsSent: notifiedCount };
  console.log('--- Finished Evening Capture Job ---', result);
  return result;
}

serve(createScheduledHandler(handleEveningCapture)); // No secret needed, it's time-based and idempotent.
