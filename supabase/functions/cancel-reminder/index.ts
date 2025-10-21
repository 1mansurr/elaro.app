import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler } from '../_shared/function-handler.ts';
import { AppError } from '../_shared/response.ts';
import type { AuthenticatedRequest } from '../_shared/function-handler.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const CancelReminderSchema = z.object({
  reminder_id: z.string().uuid(),
  reason: z.enum(['not_needed', 'rescheduled', 'task_completed', 'other']).optional(),
});

async function handleCancelReminder({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { reminder_id, reason } = CancelReminderSchema.parse(body);
  
  console.log(`Cancelling reminder ${reminder_id} for user ${user.id}`);

  // 1. Verify the reminder exists and belongs to the user
  const { data: reminder, error: fetchError } = await supabaseClient
    .from('reminders')
    .select('*')
    .eq('id', reminder_id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !reminder) {
    throw new AppError('Reminder not found or access denied', 404, 'NOT_FOUND');
  }

  // 2. Check if reminder is already completed
  if (reminder.completed) {
    return { 
      success: true, 
      message: 'Reminder was already completed',
      reminder 
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
    throw new AppError('Failed to cancel reminder', 500, 'UPDATE_ERROR', updateError);
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
    console.error('Failed to record analytics:', analyticsError);
    // Don't fail the request if analytics fails
  }

  console.log(`Successfully cancelled reminder ${reminder_id}`);
  
  return {
    success: true,
    message: 'Reminder cancelled successfully',
    reminder: updatedReminder,
  };
}

serve(createAuthenticatedHandler(
  handleCancelReminder,
  {
    rateLimitName: 'cancel-reminder',
    schema: CancelReminderSchema,
  }
));

