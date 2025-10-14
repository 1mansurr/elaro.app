import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { ScheduleRemindersSchema } from '../_shared/schemas/reminders.ts';

// Helper function to add random jitter to a date
function addJitter(date: Date, maxMinutes: number): Date {
  const jitterMinutes = Math.floor(Math.random() * (maxMinutes * 2 + 1)) - maxMinutes; // Random number between -maxMinutes and +maxMinutes
  const jitteredDate = new Date(date);
  jitteredDate.setMinutes(jitteredDate.getMinutes() + jitterMinutes);
  return jitteredDate;
}

async function handleScheduleReminders({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { session_id, session_date, topic } = body;

  console.log(`Scheduling SRS reminders for session: ${session_id}, user: ${user.id}`);

  // SECURITY: Verify the user owns the study session
  const { error: checkError } = await supabaseClient
    .from('study_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('user_id', user.id)
    .single();

  if (checkError) {
    throw new AppError('Study session not found or access denied.', 404, 'NOT_FOUND');
  }

  // --- START: NEW SRS LIMIT CHECK ---
  // Check if the user is allowed to create more SRS reminders based on their monthly limit.
  const { data: canCreate, error: rpcError } = await supabaseClient
    .rpc('can_create_srs_reminders', { p_user_id: user.id });

  if (rpcError) {
    throw new AppError('Failed to check SRS reminder limit.', 500, 'DB_ERROR');
  }

  if (canCreate === false) {
    throw new AppError('You have reached your monthly limit for Spaced Repetition reminders.', 403, 'LIMIT_REACHED');
  }
  // --- END: NEW SRS LIMIT CHECK ---

  // Step 1: Get the user's subscription tier
  const { data: userProfile, error: profileError } = await supabaseClient
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw new AppError('Failed to retrieve user profile.', 500, 'DB_ERROR');
  }

  const userTier = userProfile?.subscription_tier || 'free';

  // Step 2: Fetch the appropriate SRS schedule based on user tier
  const { data: schedule, error: scheduleError } = await supabaseClient
    .from('srs_schedules')
    .select('intervals, name')
    .eq('tier_restriction', userTier)
    .single();

  if (scheduleError || !schedule) {
    console.error(`SRS schedule not found for tier: ${userTier}. Falling back to hardcoded intervals.`, scheduleError);
    // As a fallback, use tier-specific hardcoded intervals
    const fallbackSchedule = userTier === 'free' 
      ? { intervals: [1, 3, 7], name: 'Free Tier (Fallback)' }
      : { intervals: [1, 3, 7, 14, 30, 60, 120, 180], name: 'Oddity Tier (Fallback)' };
    schedule = fallbackSchedule;
  }

  const intervals = schedule.intervals;
  const sessionDate = new Date(session_date);
  const JITTER_MINUTES = 30; // We'll add +/- 30 minutes of jitter

  // Step 2: Use the fetched intervals to create reminders.
  const remindersToInsert = intervals.map(days => {
    const baseReminderDate = new Date(sessionDate);
    baseReminderDate.setDate(sessionDate.getDate() + days);
    
    // Apply jitter to the calculated reminder date
    const finalReminderDate = addJitter(baseReminderDate, JITTER_MINUTES);

    return {
      user_id: user.id,
      session_id: session_id, // Link to the study session
      reminder_time: finalReminderDate.toISOString(), // Use the jittered date
      reminder_type: 'spaced_repetition',
      title: `Spaced Repetition: Review "${topic}"`, // Use the topic from the payload
      body: `It's time to review your study session on "${topic}" to strengthen your memory.`, // Add a helpful body
      completed: false,
    };
  });

  const { error: insertError } = await supabaseClient
    .from('reminders')
    .insert(remindersToInsert);

  if (insertError) {
    throw new AppError(insertError.message, 500, 'DB_INSERT_ERROR');
  }

  console.log(`Successfully scheduled ${remindersToInsert.length} SRS reminders based on the "${schedule.name || 'Default'}" schedule.`);
  return { success: true, remindersScheduled: remindersToInsert.length };
}

serve(createAuthenticatedHandler(
  handleScheduleReminders,
  {
    rateLimitName: 'schedule-reminders',
    schema: ScheduleRemindersSchema,
  }
));
