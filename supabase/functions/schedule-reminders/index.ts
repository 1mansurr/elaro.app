import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { ScheduleRemindersSchema } from '../_shared/schemas/reminders.ts';

const SPACED_REPETITION_INTERVALS = [1, 7, 14, 30, 60]; // in days

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

  const sessionDate = new Date(session_date);
  const remindersToInsert = SPACED_REPETITION_INTERVALS.map(days => {
    const reminderDate = new Date(sessionDate);
    reminderDate.setDate(sessionDate.getDate() + days);
    return {
      user_id: user.id,
      session_id: session_id, // Link to the study session
      reminder_time: reminderDate.toISOString(),
      reminder_type: 'spaced_repetition',
      title: `Spaced Repetition: Review ${topic}`,
      // Note: The original function had a custom reminder limit check.
      // We can add that back here if needed, or rely on global rate limiting.
    };
  });

  const { error: insertError } = await supabaseClient
    .from('reminders')
    .insert(remindersToInsert);

  if (insertError) {
    throw new AppError(insertError.message, 500, 'DB_INSERT_ERROR');
  }

  console.log(`Successfully scheduled ${remindersToInsert.length} SRS reminders.`);
  return { success: true, remindersScheduled: remindersToInsert.length };
}

serve(createAuthenticatedHandler(
  handleScheduleReminders,
  {
    rateLimitName: 'schedule-reminders',
    schema: ScheduleRemindersSchema,
  }
));
