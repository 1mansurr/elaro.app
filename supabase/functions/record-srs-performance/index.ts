import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler } from '../_shared/function-handler.ts';
import { AppError } from '../_shared/response.ts';
import type { AuthenticatedRequest } from '../_shared/function-handler.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const RecordSRSPerformanceSchema = z.object({
  session_id: z.string().uuid(),
  reminder_id: z.string().uuid().optional(),
  quality_rating: z.number().int().min(0).max(5),
  response_time_seconds: z.number().int().positive().optional(),
  schedule_next: z.boolean().default(true),
});

async function handleRecordSRSPerformance({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { session_id, reminder_id, quality_rating, response_time_seconds, schedule_next } = 
    RecordSRSPerformanceSchema.parse(body);

  console.log(`Recording SRS performance for session ${session_id}, quality: ${quality_rating}`);

  // 1. Verify the study session belongs to the user
  const { data: session, error: sessionError } = await supabaseClient
    .from('study_sessions')
    .select('*')
    .eq('id', session_id)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !session) {
    throw new AppError('Study session not found or access denied', 404, 'NOT_FOUND');
  }

  // 2. Get the last performance record for this session to get current ease factor
  const { data: lastPerformance } = await supabaseClient
    .from('srs_performance')
    .select('*')
    .eq('session_id', session_id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentInterval = lastPerformance?.next_interval_days || 1;
  const currentEaseFactor = lastPerformance?.ease_factor || 2.5;
  const repetitionNumber = (lastPerformance?.repetition_number || 0) + 1;

  // 3. Calculate next interval using SM-2 algorithm
  const { data: calculation, error: calcError } = await supabaseClient
    .rpc('calculate_next_srs_interval', {
      p_quality_rating: quality_rating,
      p_current_interval: currentInterval,
      p_ease_factor: currentEaseFactor,
      p_repetition_number: repetitionNumber,
    });

  if (calcError) {
    throw new AppError('Failed to calculate next interval', 500, 'CALCULATION_ERROR', calcError);
  }

  const nextInterval = calculation[0]?.next_interval || 1;
  const newEaseFactor = calculation[0]?.new_ease_factor || 2.5;

  // 4. Record performance
  const { data: performance, error: performanceError } = await supabaseClient
    .from('srs_performance')
    .insert({
      user_id: user.id,
      session_id: session_id,
      reminder_id: reminder_id || null,
      review_date: new Date().toISOString(),
      quality_rating,
      response_time_seconds,
      ease_factor: newEaseFactor,
      interval_days: currentInterval,
      next_interval_days: nextInterval,
      repetition_number: repetitionNumber,
    })
    .select()
    .single();

  if (performanceError) {
    throw new AppError('Failed to record performance', 500, 'INSERT_ERROR', performanceError);
  }

  // 5. Update study session metadata
  await supabaseClient
    .from('study_sessions')
    .update({
      last_reviewed_at: new Date().toISOString(),
      review_count: repetitionNumber,
    })
    .eq('id', session_id);

  // 6. Mark the current reminder as completed if provided
  if (reminder_id) {
    await supabaseClient
      .from('reminders')
      .update({
        completed: true,
        processed_at: new Date().toISOString(),
        action_taken: 'completed',
      })
      .eq('id', reminder_id);
  }

  // 7. Schedule next reminder if requested
  let nextReminder = null;
  if (schedule_next && quality_rating >= 3) {
    try {
      // Use timezone-aware scheduling
      const { data: nextReminderTime } = await supabaseClient
        .rpc('schedule_reminder_in_user_timezone', {
          p_user_id: user.id,
          p_base_time: new Date().toISOString(),
          p_days_offset: nextInterval,
          p_hour: 10, // Default to 10 AM, could use get_optimal_reminder_hour
        });

      // Insert next reminder
      const { data: newReminder, error: reminderError } = await supabaseClient
        .from('reminders')
        .insert({
          user_id: user.id,
          session_id: session_id,
          reminder_time: nextReminderTime,
          reminder_type: 'spaced_repetition',
          title: `Review: ${session.topic}`,
          body: `Time to review "${session.topic}" to strengthen your memory`,
          completed: false,
          priority: quality_rating <= 2 ? 'high' : 'medium', // Higher priority for difficult topics
        })
        .select()
        .single();

      if (!reminderError) {
        nextReminder = newReminder;
      }
    } catch (scheduleError) {
      console.error('Failed to schedule next reminder:', scheduleError);
      // Don't fail the request if scheduling fails
    }
  }

  console.log(`Performance recorded. Next interval: ${nextInterval} days, Ease factor: ${newEaseFactor}`);

  return {
    success: true,
    performance,
    next_interval_days: nextInterval,
    ease_factor: newEaseFactor,
    next_reminder: nextReminder,
    message: quality_rating >= 3 
      ? `Great job! Next review in ${nextInterval} ${nextInterval === 1 ? 'day' : 'days'}`
      : `Let's review this again tomorrow to strengthen your memory`,
  };
}

serve(createAuthenticatedHandler(
  handleRecordSRSPerformance,
  {
    rateLimitName: 'record-srs-performance',
    schema: RecordSRSPerformanceSchema,
  }
));

