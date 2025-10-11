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

  // Step 1: Fetch the default SRS schedule from the database.
  const { data: schedule, error: scheduleError } = await supabaseClient
    .from('srs_schedules')
    .select('intervals, name')
    .eq('is_default', true)
    .single();

  if (scheduleError || !schedule) {
    console.error('Default SRS schedule not found. Falling back to hardcoded intervals.', scheduleError);
    // As a fallback, use the hardcoded intervals to ensure reminders are still created.
    const fallbackSchedule = { intervals: [1, 7, 14, 30, 60], name: 'Default (Fallback)' };
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
