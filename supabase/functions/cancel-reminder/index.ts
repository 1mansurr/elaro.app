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

const CancelReminderSchema = z.object({
  reminder_id: z.string().uuid(),
  reason: z
    .enum(['not_needed', 'rescheduled', 'task_completed', 'other'])
    .optional(),
});

async function handleCancelReminder(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const { reminder_id, reason } = body;

  await logger.info(
    'Cancelling reminder',
    { user_id: user.id, reminder_id },
    traceContext,
  );

  // 1. Verify the reminder exists and belongs to the user
  const { data: reminder, error: fetchError } = await supabaseClient
    .from('reminders')
    .select('*')
    .eq('id', reminder_id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !reminder) {
    if (fetchError) {
      throw handleDbError(fetchError);
    }
    throw new AppError(
      'Reminder not found or access denied',
      404,
      ERROR_CODES.DB_NOT_FOUND,
    );
  }

  // 2. Check if reminder is already completed
  if (reminder.completed) {
    return {
      success: true,
      message: 'Reminder was already completed',
      reminder,
    };
  }

  // 3. Mark reminder as completed/cancelled
  const { data: updatedReminder, error: updateError } = await supabaseClient
    .from('reminders')
    .update({
      completed: true,
      processed_at: new Date().toISOString(),
      action_taken: reason || 'cancelled',
      dismissed_at: new Date().toISOString(),
    })
    .eq('id', reminder_id)
    .select()
    .single();

  if (updateError) {
    throw handleDbError(updateError);
  }

  // 4. Record analytics
  try {
    await supabaseClient.from('reminder_analytics').insert({
      user_id: user.id,
      reminder_id: reminder_id,
      reminder_type: reminder.reminder_type,
      scheduled_time: reminder.reminder_time,
      sent_time: reminder.sent_at,
      opened: false,
      action_taken: 'cancelled',
      effectiveness_score: 0,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
    });
  } catch (analyticsError) {
    await logger.error(
      'Failed to record analytics',
      {
        user_id: user.id,
        reminder_id,
        error:
          analyticsError instanceof Error
            ? analyticsError.message
            : String(analyticsError),
      },
      traceContext,
    );
    // Don't fail the request if analytics fails
  }

  await logger.info(
    'Successfully cancelled reminder',
    { user_id: user.id, reminder_id },
    traceContext,
  );

  return {
    success: true,
    message: 'Reminder cancelled successfully',
    reminder: updatedReminder,
  };
}

serve(
  createAuthenticatedHandler(handleCancelReminder, {
    rateLimitName: 'cancel-reminder',
    schema: CancelReminderSchema,
  }),
);
