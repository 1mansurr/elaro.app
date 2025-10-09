// FILE: supabase/functions/send-evening-capture-notifications/index.ts
// ACTION: Create this new Edge Function for sending the evening prompt.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendPushNotification } from '../_shared/send-push-notification.ts';

serve(async (_req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Fetch all users who have evening capture enabled and have a push token.
    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        timezone,
        user_devices ( push_token )
      `)
      .eq('evening_capture_enabled', true);

    if (userError) throw userError;

    // 2. Process each user individually
    for (const user of users) {
      if (!user.user_devices || user.user_devices.length === 0) {
        continue; // Skip user if they have no registered devices
      }

      const pushTokens = user.user_devices.map(d => d.push_token);
      const timezone = user.timezone || 'UTC';

      // 3. Check if it's currently 7:30 PM (19:30) in the user's timezone.
      // We'll check for the 7 PM hour and then check the minute inside the loop.
      const localHour = new Date().toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', hour12: false });
      
      // The check needs to be for the 19th hour.
      if (parseInt(localHour) === 19) {
        // Now check if the minute is around 30. We run this job every 30 mins,
        // so we check the current minute.
        const currentMinute = new Date().getMinutes();
        if (currentMinute >= 30 && currentMinute < 59) { // Run between xx:30 and xx:59
            const title = "Don't Forget Your Homework!";
            const message = "Did you get any new assignments today? Add them to Elaro now so you don't forget!";
            
            // 4. Send the push notification
            await sendPushNotification(pushTokens, title, message);
        }
      }
    }

    return new Response(JSON.stringify({ message: `Processed ${users.length} users for evening capture.` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error sending evening capture notifications:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
