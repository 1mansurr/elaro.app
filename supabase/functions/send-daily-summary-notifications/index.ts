// FILE: supabase/functions/send-daily-summary-notifications/index.ts
// ACTION: Create this new Edge Function for sending daily summaries.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendPushNotification } from '../_shared/send-push-notification.ts';

interface UserProfile {
  id: string;
  timezone: string;
  push_tokens: string[];
}

serve(async (_req) => {
  try {
    // Use the SERVICE_ROLE_KEY for admin-level access to all users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Fetch all users who have morning summaries enabled and have a push token.
    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        timezone,
        user_devices ( push_token )
      `)
      .eq('morning_summary_enabled', true);

    if (userError) throw userError;

    // 2. Process each user individually
    for (const user of users) {
      if (!user.user_devices || user.user_devices.length === 0) {
        continue; // Skip user if they have no registered devices
      }

      const pushTokens = user.user_devices.map(d => d.push_token);
      const timezone = user.timezone || 'UTC';

      // 3. Calculate the start and end of "today" in the user's timezone.
      // This is complex logic, so we'll use a helper or do it inline.
      // For simplicity here, let's assume a helper `getTodayInTimezone` exists.
      // In a real scenario, we'd use a library like date-fns-tz.
      // Let's simulate it:
      const now = new Date();
      const todayStart = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayStart.getDate() + 1);

      // 4. Fetch today's tasks for the user
      const [lecturesRes, assignmentsRes, studySessionsRes] = await Promise.all([
        supabaseAdmin.from('lectures').select('id', { count: 'exact' }).eq('user_id', user.id).gte('start_time', todayStart.toISOString()).lt('start_time', todayEnd.toISOString()),
        supabaseAdmin.from('assignments').select('id', { count: 'exact' }).eq('user_id', user.id).gte('due_date', todayStart.toISOString()).lt('due_date', todayEnd.toISOString()),
        supabaseAdmin.from('study_sessions').select('id', { count: 'exact' }).eq('user_id', user.id).gte('session_date', todayStart.toISOString()).lt('session_date', todayEnd.toISOString()),
      ]);

      const lectureCount = lecturesRes.count || 0;
      const assignmentCount = assignmentsRes.count || 0;
      const studySessionCount = studySessionsRes.count || 0;
      const totalTasks = lectureCount + assignmentCount + studySessionCount;

      if (totalTasks === 0) {
        continue; // Don't send a notification if there's nothing scheduled
      }

      // 5. Construct the summary message
      let message = "Today's Plan: ";
      const parts = [];
      if (lectureCount > 0) parts.push(`${lectureCount} lecture${lectureCount > 1 ? 's' : ''}`);
      if (assignmentCount > 0) parts.push(`${assignmentCount} assignment${assignmentCount > 1 ? 's' : ''} due`);
      if (studySessionCount > 0) parts.push(`${studySessionCount} study session${studySessionCount > 1 ? 's' : ''}`);
      message += parts.join(', ') + '.';

      // 6. Send the push notification
      await sendPushNotification(pushTokens, "Here's your daily summary!", message);
    }

    return new Response(JSON.stringify({ message: `Processed ${users.length} users.` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error sending daily summaries:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
