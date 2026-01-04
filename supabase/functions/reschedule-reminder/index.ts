import {
  createAuthenticatedHandler,
  AppError,
  AuthenticatedRequest,
} from '../_shared/function-handler.ts';
import { z } from 'zod';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';

const schema = z.object({
  reminder_id: z.string().uuid(),
  new_scheduled_time: z.string().datetime(),
  notification_id: z.string().optional(),
});

async function handleRescheduleReminder(
  req: AuthenticatedRequest,
): Promise<{ success: boolean; reminder_id: string }> {
  const { user, supabaseClient, body } = req;
  // PASS 1: Use safeParse to prevent ZodError from crashing worker
  const validationResult = schema.safeParse(body);
  if (!validationResult.success) {
    const zodError = validationResult.error;
    const flattened = zodError.flatten();
    throw new AppError('Validation failed', 400, ERROR_CODES.VALIDATION_ERROR, {
      message: 'Request body validation failed',
      errors: flattened.fieldErrors,
      formErrors: flattened.formErrors,
    });
  }
  const { reminder_id, new_scheduled_time, notification_id } =
    validationResult.data;

  // Validate that new scheduled time is in the future
  const scheduledDate = new Date(new_scheduled_time);
  const now = new Date();
  if (scheduledDate <= now) {
    throw new AppError(
      'Scheduled time must be in the future',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  // 1. Verify reminder belongs to user
  const { data: reminder, error: fetchError } = await supabaseClient
    .from('reminders')
    .select('*')
    .eq('id', reminder_id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !reminder) {
    throw new AppError('Reminder not found', 404, ERROR_CODES.NOT_FOUND);
  }

  // 2. Update reminder
  const { error: updateError } = await supabaseClient
    .from('reminders')
    .update({
      reminder_time: new_scheduled_time,
      scheduled_at: new Date().toISOString(),
      notification_id: notification_id || reminder.notification_id,
    })
    .eq('id', reminder_id);

  if (updateError) {
    throw handleDbError(updateError);
  }

  return { success: true, reminder_id };
}

export default createAuthenticatedHandler(handleRescheduleReminder, {
  rateLimitName: 'reschedule-reminder',
  schema,
});
