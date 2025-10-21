import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { sendPushNotification } from '../_shared/send-push-notification.ts';

// The core business logic for sending daily summaries
async function handleSendDailySummaries(supabaseAdminClient: SupabaseClient) {
  console.log('--- Starting Daily Summary Notifications Job ---');

  // 1. Get all users who have morning summaries enabled from the new preferences table
  const { data: users, error: usersError } = await supabaseAdminClient
    .from('notification_preferences')
    .select(`
      user_id,
      user:users (
        id,
        timezone,
        user_devices (
          push_token
        )
      )
    `)
    .eq('morning_summary_enabled', true);

  if (usersError) {
    throw new Error(`Failed to fetch users: ${usersError.message}`);
  }

  if (!users || users.length === 0) {
    console.log('No users with morning summaries enabled.');
    return { success: true, processedUsers: 0 };
  }

  console.log(`Found ${users.length} users to notify.`);

  // 2. Process each user
  let successCount = 0;
  let failureCount = 0;

  for (const pref of users) {
    const user = pref.user; // The user object is now nested
    if (!user) continue;
    try {
      if (!user.user_devices || user.user_devices.length === 0) {
        continue; // Skip user if they have no registered devices
      }

      const pushTokens = user.user_devices.map(d => d.push_token);
      const timezone = user.timezone || 'UTC';

      // 3. Calculate the start and end of "today" in the user's timezone
      const now = new Date();
      const todayStart = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayStart.getDate() + 1);

      // 4. Fetch today's tasks for the user
      const [lecturesRes, assignmentsRes, studySessionsRes] = await Promise.all([
        supabaseAdminClient.from('lectures').select('id', { count: 'exact' }).eq('user_id', user.id).gte('start_time', todayStart.toISOString()).lt('start_time', todayEnd.toISOString()),
        supabaseAdminClient.from('assignments').select('id', { count: 'exact' }).eq('user_id', user.id).gte('due_date', todayStart.toISOString()).lt('due_date', todayEnd.toISOString()),
        supabaseAdminClient.from('study_sessions').select('id', { count: 'exact' }).eq('user_id', user.id).gte('session_date', todayStart.toISOString()).lt('session_date', todayEnd.toISOString()),
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

      // 6. Send the push notification with deep link to home
      const result = await sendPushNotification(
        supabaseAdminClient, 
        pushTokens, 
        "Here's your daily summary!", 
        message,
        {
          url: 'elaro://home',
          summaryType: 'daily',
          lectureCount,
          assignmentCount,
          studySessionCount,
        }
      );
      successCount++;
    } catch (error) {
      console.error(`Failed to process daily summary for user ${user.id}:`, error.message);
      failureCount++;
      // Continue to the next user, don't fail the whole job
    }
  }

  const result = {
    success: true,
    totalUsers: users.length,
    notificationsSent: successCount,
    failures: failureCount,
  };

  console.log('--- Finished Daily Summary Notifications Job ---', result);
  return result;
}

// Wrap the business logic with our secure, scheduled handler
serve(createScheduledHandler(handleSendDailySummaries));
