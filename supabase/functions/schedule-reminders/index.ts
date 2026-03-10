// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
  AppError,
} from '../_shared/function-handler.ts';
import { isPremium } from '../_shared/permissions.ts';
import { ScheduleRemindersSchema } from '../_shared/schemas/reminders.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { scheduleMultipleSRSReminders } from '../_shared/reminder-scheduling.ts';

async function handleScheduleReminders(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const { session_id, session_date, topic } = body;

  await logger.info(
    'Scheduling SRS reminders',
    { user_id: user.id, session_id },
    traceContext,
  );

  // SECURITY: Verify the user owns the study session
  const { error: checkError } = await supabaseClient
    .from('study_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('user_id', user.id)
    .single();

  if (checkError) {
    throw handleDbError(checkError);
  }

  // --- START: NEW SRS LIMIT CHECK ---
  // Check if the user is allowed to create more SRS reminders based on their monthly limit.
  const { data: canCreate, error: rpcError } = await supabaseClient.rpc(
    'can_create_srs_reminders',
    { p_user_id: user.id },
  );

  if (rpcError) {
    throw handleDbError(rpcError);
  }

  if (canCreate === false) {
    throw new AppError(
      'You have reached your monthly limit for Spaced Repetition reminders.',
      403,
      ERROR_CODES.RESOURCE_LIMIT_EXCEEDED,
    );
  }
  // --- END: NEW SRS LIMIT CHECK ---

  // Step 1: Get the user's subscription tier
  const { data: userProfile, error: profileError } = await supabaseClient
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw handleDbError(profileError);
  }

  if (
    !userProfile ||
    typeof userProfile !== 'object' ||
    !('subscription_tier' in userProfile)
  ) {
    throw new AppError(
      'Failed to fetch user profile',
      500,
      ERROR_CODES.DB_QUERY_ERROR,
    );
  }

  const userProfileTyped = userProfile as { subscription_tier: string };
  const userTier = userProfileTyped.subscription_tier || 'free';

  // Check if user has permission to create SRS reminders
  if (!isPremium(userTier)) {
    throw new AppError(
      'Premium subscription required for SRS reminders.',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  // Step 2: Fetch the appropriate SRS schedule based on user tier
  const { data: scheduleData, error: scheduleError } = await supabaseClient
    .from('srs_schedules')
    .select('intervals, name')
    .eq('tier_restriction', userTier)
    .single();

  let schedule: { intervals: number[]; name: string };
  if (scheduleError || !scheduleData) {
    await logger.warn(
      'SRS schedule not found, using fallback',
      { user_id: user.id, tier: userTier, error: scheduleError?.message },
      traceContext,
    );
    // As a fallback, use tier-specific hardcoded intervals
    schedule =
      userTier === 'free'
        ? { intervals: [1, 3, 7], name: 'Free Tier (Fallback)' }
        : {
            intervals: [1, 3, 7, 14, 30, 60, 120, 180],
            name: 'Oddity Tier (Fallback)',
          };
  } else {
    schedule = scheduleData as { intervals: number[]; name: string };
  }

  const intervals = schedule.intervals;
  const sessionDate = new Date(session_date as string);
  const JITTER_MINUTES = 30; // We'll add +/- 30 minutes of jitter

  // Get optimal hour for reminders based on user patterns
  const { data: optimalHour } = await supabaseClient.rpc(
    'get_optimal_reminder_hour',
    {
      p_user_id: user.id,
      p_reminder_type: 'spaced_repetition',
    },
  );

  const preferredHour =
    (typeof optimalHour === 'number' ? optimalHour : null) || 10; // Default to 10 AM if no data

  // Cancel existing reminders for this session before scheduling new ones
  const { cancelExistingSRSReminders } =
    await import('../_shared/reminder-scheduling.ts');
  const cancelledCount = await cancelExistingSRSReminders(
    supabaseClient,
    user.id,
    session_id as string,
  );
  if (cancelledCount > 0) {
    await logger.info(
      'Cancelled existing reminders before rescheduling',
      {
        user_id: user.id,
        session_id,
        cancelled_count: cancelledCount,
      },
      traceContext,
    );
  }

  // Use consolidated scheduling service (deterministic jitter by default)
  const remindersToInsert = await scheduleMultipleSRSReminders(supabaseClient, {
    userId: user.id,
    sessionId: session_id as string,
    sessionDate,
    topic: topic as string,
    preferredHour: preferredHour as number,
    jitterMinutes: JITTER_MINUTES,
    useDeterministicJitter: true, // Deterministic for consistency
    intervals,
  });

  const { error: insertError } = await supabaseClient
    .from('reminders')
    .insert(remindersToInsert);

  if (insertError) {
    throw handleDbError(insertError);
  }

  await logger.info(
    'Successfully scheduled SRS reminders',
    {
      user_id: user.id,
      count: remindersToInsert.length,
      schedule_name: schedule.name || 'Default',
    },
    traceContext,
  );

  return { success: true, remindersScheduled: remindersToInsert.length };
}

serve(
  createAuthenticatedHandler(handleScheduleReminders, {
    rateLimitName: 'schedule-reminders',
    schema: ScheduleRemindersSchema,
  }),
);
