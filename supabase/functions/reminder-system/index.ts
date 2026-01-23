/**
 * Consolidated Reminder System Edge Function
 *
 * This function consolidates all reminder-related operations that were previously
 * spread across multiple separate Edge Functions.
 *
 * Routes:
 * - POST /reminder-system/schedule - Schedule reminders
 * - POST /reminder-system/cancel - Cancel specific reminder
 * - POST /reminder-system/cancel-all - Cancel all reminders for item
 * - GET /reminder-system/list - List user reminders
 * - POST /reminder-system/process - Process due reminders
 * - PUT /reminder-system/update/:id - Update reminder
 */

// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  AuthenticatedRequest,
  AppError,
} from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import {
  wrapOldHandler,
  extractIdFromUrl,
  handleDbError,
} from '../api-v2/_handler-utils.ts';
import { ScheduleRemindersSchema } from '../_shared/schemas/reminders.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/response.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { z } from 'zod';
import { scheduleMultipleSRSReminders } from '../_shared/reminder-scheduling.ts';
import {
  type SupabaseClient,
  type User,
  // @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
} from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const CancelReminderSchema = z.object({
  reminder_id: z.string().uuid(),
});

const CancelAllRemindersSchema = z.object({
  item_id: z.string().uuid(),
  item_type: z.enum(['study_session', 'assignment', 'lecture']),
});

const UpdateReminderSchema = z.object({
  reminder_time: z.string().datetime().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  completed: z.boolean().optional(),
});

// Reminder service class
class ReminderService {
  constructor(
    private supabaseClient: SupabaseClient,
    private user: User,
  ) {}

  async scheduleReminders(data: Record<string, unknown>) {
    const { session_id, session_date, topic } = data;

    // Type guards
    if (typeof session_id !== 'string' || typeof session_date !== 'string' || typeof topic !== 'string') {
      throw new AppError(
        'Invalid request data: session_id, session_date, and topic are required',
        400,
        ERROR_CODES.INVALID_INPUT,
      );
    }

    // SECURITY: Verify the user owns the study session
    const { error: checkError } = await this.supabaseClient
      .from('study_sessions')
      .select('id')
      .eq('id', session_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) {
      throw new AppError(
        'Study session not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    // Check premium permissions for advanced reminder features
    const { data: userData } = await this.supabaseClient
      .from('users')
      .select('subscription_tier')
      .eq('id', this.user.id)
      .single();

    const isPremiumUser = userData?.subscription_tier === 'oddity';

    if (!isPremiumUser) {
      throw new AppError(
        'Premium subscription required for SRS reminders.',
        403,
        ERROR_CODES.FORBIDDEN,
      );
    }

    const userTier = userData?.subscription_tier || 'free';

    // Fetch the appropriate SRS schedule based on user tier (not hardcoded)
    const { data: schedule, error: scheduleError } = await this.supabaseClient
      .from('srs_schedules')
      .select('intervals, name')
      .eq('tier_restriction', userTier)
      .single();

    let scheduleData: { intervals: number[]; name: string };
    if (scheduleError || !schedule) {
      // Fallback to tier-specific hardcoded intervals if schedule not found
      scheduleData =
        userTier === 'free'
          ? { intervals: [1, 3, 7], name: 'Free Tier (Fallback)' }
          : {
              intervals: [1, 3, 7, 14, 30, 60, 120, 180],
              name: 'Oddity Tier (Fallback)',
            };
    } else {
      scheduleData = schedule as { intervals: number[]; name: string };
    }

    const maxReminders = isPremiumUser ? 10 : 3;
    const srsIntervals = scheduleData.intervals.slice(0, maxReminders); // Limit based on tier
    const sessionDate = new Date(session_date as string);

    // Cancel existing reminders for this session before scheduling new ones
    const { cancelExistingSRSReminders } =
      await import('../_shared/reminder-scheduling.ts');
    const cancelledCount = await cancelExistingSRSReminders(
      this.supabaseClient,
      this.user.id,
      session_id as string,
    );
    if (cancelledCount > 0) {
      console.log(
        `Cancelled ${cancelledCount} existing reminders for session ${session_id}`,
      );
    }

    // Use consolidated scheduling service for consistent behavior
    const remindersToInsert = await scheduleMultipleSRSReminders(
      this.supabaseClient,
      {
        userId: this.user.id,
        sessionId: session_id as string,
        sessionDate,
        topic: topic as string,
        preferredHour: 10, // Default hour
        jitterMinutes: 30,
        useDeterministicJitter: true, // Deterministic for consistency
        intervals: srsIntervals.slice(0, maxReminders), // Limit based on tier
      },
    );

    // Map to the format expected by this function (with day_number and message fields)
    const reminders = remindersToInsert.map((reminder, index) => ({
      ...reminder,
      study_session_id: reminder.session_id, // Map session_id to study_session_id for compatibility
      reminder_type: 'spaced_repetition' as const, // Changed from 'srs_review' to standardize
      day_number: srsIntervals[index],
      message: reminder.body, // Map body to message for compatibility
    }));

    // Insert reminders
    const { data: createdReminders, error: insertError } =
      await this.supabaseClient.from('reminders').insert(reminders).select();

    if (insertError) handleDbError(insertError);

    return createdReminders;
  }

  async cancelReminder(data: Record<string, unknown>) {
    const { reminder_id } = data;

    // SECURITY: Verify ownership
    const { error: checkError } = await this.supabaseClient
      .from('reminders')
      .select('id')
      .eq('id', reminder_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) {
      throw new AppError(
        'Reminder not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    // Cancel the reminder
    const { error: deleteError } = await this.supabaseClient
      .from('reminders')
      .update({
        cancelled: true,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', reminder_id);

    if (deleteError) handleDbError(deleteError);

    return { success: true, message: 'Reminder cancelled successfully' };
  }

  async cancelAllReminders(data: Record<string, unknown>) {
    const { item_id, item_type } = data;

    // SECURITY: Verify ownership based on item type
    let ownershipCheck;
    switch (item_type) {
      case 'study_session':
        ownershipCheck = await this.supabaseClient
          .from('study_sessions')
          .select('id')
          .eq('id', item_id)
          .eq('user_id', this.user.id)
          .single();
        break;
      case 'assignment':
        ownershipCheck = await this.supabaseClient
          .from('assignments')
          .select('id')
          .eq('id', item_id)
          .eq('user_id', this.user.id)
          .single();
        break;
      case 'lecture':
        ownershipCheck = await this.supabaseClient
          .from('lectures')
          .select('id')
          .eq('id', item_id)
          .eq('user_id', this.user.id)
          .single();
        break;
      default:
        throw new AppError('Invalid item type', 400, ERROR_CODES.INVALID_INPUT);
    }

    if (ownershipCheck.error) {
      throw new AppError(
        'Item not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    // Cancel all reminders for this item
    const { error: updateError } = await this.supabaseClient
      .from('reminders')
      .update({
        cancelled: true,
        cancelled_at: new Date().toISOString(),
      })
      .eq(`${item_type}_id`, item_id)
      .eq('user_id', this.user.id)
      .eq('cancelled', false);

    if (updateError) handleDbError(updateError);

    return { success: true, message: 'All reminders cancelled successfully' };
  }

  async listReminders() {
    const { data: reminders, error } = await this.supabaseClient
      .from('reminders')
      .select(
        `
        *,
        study_sessions (
          id,
          topic,
          session_date
        ),
        assignments (
          id,
          title,
          due_date
        ),
        lectures (
          id,
          lecture_name,
          start_time
        )
      `,
      )
      .eq('user_id', this.user.id)
      .eq('cancelled', false)
      .order('reminder_time', { ascending: true });

    if (error) handleDbError(error);

    return reminders;
  }

  async processDueReminders() {
    const now = new Date().toISOString();

    // Get due reminders
    const { data: dueReminders, error: fetchError } = await this.supabaseClient
      .from('reminders')
      .select(
        `
        *,
        study_sessions (
          id,
          topic,
          session_date
        ),
        assignments (
          id,
          title,
          due_date
        ),
        lectures (
          id,
          lecture_name,
          start_time
        )
      `,
      )
      .eq('user_id', this.user.id)
      .eq('cancelled', false)
      .eq('completed', false)
      .lte('reminder_time', now);

    if (fetchError) handleDbError(fetchError);

    // Process each due reminder
    const processedReminders = [];
    for (const reminder of dueReminders || []) {
      // Mark as completed
      const { error: updateError } = await this.supabaseClient
        .from('reminders')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', reminder.id);

      if (updateError) {
        // Log error but continue processing other reminders
        continue;
      }

      processedReminders.push({
        ...reminder,
        completed: true,
        completed_at: new Date().toISOString(),
      });
    }

    return {
      processed_count: processedReminders.length,
      reminders: processedReminders,
    };
  }

  async updateReminder(reminderId: string, data: Record<string, unknown>) {
    // SECURITY: Verify ownership
    const { error: checkError } = await this.supabaseClient
      .from('reminders')
      .select('id')
      .eq('id', reminderId)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) {
      throw new AppError(
        'Reminder not found or access denied.',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    // Update the reminder
    const { data: updatedReminder, error: updateError } =
      await this.supabaseClient
        .from('reminders')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminderId)
        .select()
        .single();

    if (updateError) handleDbError(updateError);

    return updatedReminder;
  }
}

// Handler functions - Use AuthenticatedRequest and ReminderService
async function handleScheduleReminders(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new ReminderService(supabaseClient, user);
  return await service.scheduleReminders(body);
}

async function handleCancelReminder(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new ReminderService(supabaseClient, user);
  return await service.cancelReminder(body);
}

async function handleCancelAllReminders(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new ReminderService(supabaseClient, user);
  return await service.cancelAllReminders(body);
}

async function handleListReminders(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new ReminderService(supabaseClient, user);
  return await service.listReminders();
}

async function handleProcessDueReminders(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new ReminderService(supabaseClient, user);
  return await service.processDueReminders();
}

async function handleUpdateReminder(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const reminderId = (body?.reminder_id as string) || extractIdFromUrl(req.url);
  if (!reminderId || typeof reminderId !== 'string') {
    throw new AppError(
      'Reminder ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }
  const service = new ReminderService(supabaseClient, user);
  return await service.updateReminder(reminderId, body);
}

// Main handler with routing
serve(async (req: Request) => {
  const origin = req.headers.get('Origin');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Get action - if last part is a UUID and second-to-last is 'update', use 'update' as action
    let action = pathParts[pathParts.length - 1];
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      uuidPattern.test(action) &&
      pathParts.length > 1 &&
      pathParts[pathParts.length - 2] === 'update'
    ) {
      action = 'update';
    }

    // Route to appropriate handler
    const handler = getHandler(action);
    if (!handler) {
      return errorResponse(
        new AppError('Invalid action', 404, ERROR_CODES.DB_NOT_FOUND),
      );
    }

    // Handler is already wrapped with createAuthenticatedHandler, just call it
    return await handler(req);
  } catch (error) {
    const traceContext = extractTraceContext(req);
    await logger.error(
      'Reminder system error',
      {
        error: error instanceof Error ? error.message : String(error),
        url: req.url,
      },
      traceContext,
    );
    return errorResponse(
      error instanceof AppError
        ? error
        : new AppError(
            'Internal server error',
            500,
            ERROR_CODES.INTERNAL_ERROR,
          ),
      500,
    );
  }
});

// Route handlers - All handlers are wrapped with createAuthenticatedHandler
type HandlerFunction = (req: Request) => Promise<Response>;

function getHandler(action: string | null) {
  const handlers: Record<string, HandlerFunction> = {
    schedule: wrapOldHandler(
      handleScheduleReminders,
      'reminders-schedule',
      ScheduleRemindersSchema,
      true,
    ),
    cancel: wrapOldHandler(
      handleCancelReminder,
      'reminders-cancel',
      CancelReminderSchema,
      true,
    ),
    'cancel-all': wrapOldHandler(
      handleCancelAllReminders,
      'reminders-cancel-all',
      CancelAllRemindersSchema,
      true,
    ),
    list: wrapOldHandler(
      handleListReminders,
      'reminders-list',
      undefined,
      false,
    ),
    process: wrapOldHandler(
      handleProcessDueReminders,
      'reminders-process',
      undefined,
      false,
    ),
    update: wrapOldHandler(
      handleUpdateReminder,
      'reminders-update',
      UpdateReminderSchema,
      true,
    ),
  };

  return action ? handlers[action] : undefined;
}
