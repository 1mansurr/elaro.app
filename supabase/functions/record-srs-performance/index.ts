import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
  AppError,
} from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { z } from 'zod';

const RecordSRSPerformanceSchema = z.object({
  session_id: z.string().uuid(),
  reminder_id: z.string().uuid().optional(),
  quality_rating: z.number().int().min(0).max(5),
  response_time_seconds: z.number().int().positive().optional(),
  schedule_next: z.boolean().default(true),
});

async function handleRecordSRSPerformance(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const {
    session_id,
    reminder_id,
    quality_rating,
    response_time_seconds,
    schedule_next,
  } = body;

  await logger.info(
    'Recording SRS performance',
    {
      user_id: user.id,
      session_id,
      quality_rating,
    },
    traceContext,
  );

  // 1. Verify the study session belongs to the user
  const { data: session, error: sessionError } = await supabaseClient
    .from('study_sessions')
    .select('*')
    .eq('id', session_id)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !session) {
    if (sessionError) {
      throw handleDbError(sessionError);
    }
    throw new AppError(
      'Study session not found or access denied',
      404,
      ERROR_CODES.DB_NOT_FOUND,
    );
  }

  // 1.5: Prevent duplicate reviews within 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recentReview } = await supabaseClient
    .from('srs_performance')
    .select('id, review_date')
    .eq('session_id', session_id)
    .eq('user_id', user.id)
    .gte('review_date', fiveMinutesAgo)
    .order('review_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentReview) {
    throw new AppError(
      'You have already reviewed this session recently. Please wait a few minutes before reviewing again.',
      429,
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
    );
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

  // Validate and sanitize parameters from last performance
  let currentInterval = lastPerformance?.next_interval_days || 1;
  let currentEaseFactor = lastPerformance?.ease_factor || 2.5;
  let repetitionNumber = (lastPerformance?.repetition_number || 0) + 1;

  // Parameter validation and bounds checking
  if (lastPerformance) {
    // Validate ease factor (should be 1.3 to 3.0)
    if (
      lastPerformance.ease_factor < 1.3 ||
      lastPerformance.ease_factor > 3.0
    ) {
      console.warn(
        `Invalid ease factor ${lastPerformance.ease_factor} for session ${session_id}, resetting to 2.5`,
      );
      currentEaseFactor = 2.5;
    }

    // Validate interval (should be 1 to 365 days)
    if (
      lastPerformance.next_interval_days < 1 ||
      lastPerformance.next_interval_days > 365
    ) {
      console.warn(
        `Invalid interval ${lastPerformance.next_interval_days} for session ${session_id}, resetting to 1`,
      );
      currentInterval = 1;
    }

    // Validate repetition number (should be positive)
    if (lastPerformance.repetition_number < 0) {
      console.warn(
        `Invalid repetition number ${lastPerformance.repetition_number} for session ${session_id}, resetting to 0`,
      );
      repetitionNumber = 1;
    } else {
      repetitionNumber = lastPerformance.repetition_number + 1;
    }
  }

  // 2.5: Check for cramming behavior (multiple reviews in short time)
  const { data: crammingData } = await supabaseClient.rpc('detect_cramming', {
    p_user_id: user.id,
    p_session_id: session_id,
    p_hours_window: 24,
  });

  const isCramming = crammingData?.[0]?.is_cramming || false;

  // Adjust ease factor if cramming detected (be more conservative)
  let adjustedEaseFactor = currentEaseFactor;
  if (isCramming) {
    console.log(
      `Cramming detected for session ${session_id} - adjusting algorithm to be more conservative`,
    );
    // When cramming, reduce ease factor slightly to prevent over-confidence
    // This makes intervals grow slower during cramming sessions
    adjustedEaseFactor = Math.max(1.3, currentEaseFactor - 0.1);
  }

  // 3. Calculate next interval using SM-2 algorithm
  const { data: calculation, error: calcError } = await supabaseClient.rpc(
    'calculate_next_srs_interval',
    {
      p_quality_rating: quality_rating,
      p_current_interval: currentInterval,
      p_ease_factor: adjustedEaseFactor, // Use adjusted ease factor
      p_repetition_number: repetitionNumber,
    },
  );

  if (calcError) {
    throw handleDbError(calcError);
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
    throw handleDbError(performanceError);
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

  // 6.5: Cancel all future reminders for this session (regardless of schedule_next)
  // This ensures that when a user reviews, pending reminders are cleared
  const { cancelExistingSRSReminders } = await import(
    '../_shared/reminder-scheduling.ts'
  );
  const cancelledCount = await cancelExistingSRSReminders(
    supabaseClient,
    user.id,
    session_id,
  );
  if (cancelledCount > 0) {
    await logger.info(
      'Cancelled existing reminders after review',
      {
        user_id: user.id,
        session_id,
        cancelled_count: cancelledCount,
      },
      traceContext,
    );
  }

  // 7. Schedule next reminder if requested
  let nextReminder = null;
  let schedulingWarning = null;
  if (schedule_next && quality_rating >= 3) {
    try {
      // Get optimal hour for reminders
      const { data: optimalHour } = await supabaseClient.rpc(
        'get_optimal_reminder_hour',
        {
          p_user_id: user.id,
          p_reminder_type: 'spaced_repetition',
        },
      );

      const preferredHour = optimalHour || 10;

      // Use timezone-aware scheduling
      const { data: nextReminderTime } = await supabaseClient.rpc(
        'schedule_reminder_in_user_timezone',
        {
          p_user_id: user.id,
          p_base_time: new Date().toISOString(),
          p_days_offset: nextInterval,
          p_hour: preferredHour,
        },
      );

      // Apply deterministic jitter (same as initial scheduling)
      const { addDeterministicJitter } = await import(
        '../_shared/deterministic-jitter.ts'
      );
      const baseTime = nextReminderTime
        ? new Date(nextReminderTime)
        : new Date();
      const jitterSeed = `${session_id}-${nextInterval}`;
      const jitteredTime = addDeterministicJitter(baseTime, 30, jitterSeed); // 30 minutes jitter

      // Insert next reminder
      const { data: newReminder, error: reminderError } = await supabaseClient
        .from('reminders')
        .insert({
          user_id: user.id,
          session_id: session_id,
          reminder_time: jitteredTime.toISOString(),
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
      } else {
        await logger.error(
          'Failed to insert next reminder',
          {
            user_id: user.id,
            session_id,
            error: reminderError.message,
          },
          traceContext,
        );
        schedulingWarning =
          'Your review was recorded, but the next reminder could not be scheduled. Please schedule it manually.';
      }
    } catch (scheduleError) {
      await logger.error(
        'Failed to schedule next reminder',
        {
          user_id: user.id,
          session_id,
          error:
            scheduleError instanceof Error
              ? scheduleError.message
              : String(scheduleError),
        },
        traceContext,
      );
      schedulingWarning =
        'Your review was recorded, but the next reminder could not be scheduled. Please schedule it manually.';
    }
  }

  await logger.info(
    'SRS performance recorded',
    {
      user_id: user.id,
      session_id,
      next_interval_days: nextInterval,
      ease_factor: newEaseFactor,
    },
    traceContext,
  );

  return {
    success: true,
    performance,
    next_interval_days: nextInterval,
    ease_factor: newEaseFactor,
    next_reminder: nextReminder,
    warning: schedulingWarning || null, // Add warning field if scheduling failed
    message:
      quality_rating >= 3
        ? `Great job! Next review in ${nextInterval} ${nextInterval === 1 ? 'day' : 'days'}`
        : `Let's review this again tomorrow to strengthen your memory`,
  };
}

serve(
  createAuthenticatedHandler(handleRecordSRSPerformance, {
    rateLimitName: 'record-srs-performance',
    schema: RecordSRSPerformanceSchema,
  }),
);
