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
 * - PUT /reminder-system/update - Update reminder
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { isPremium, PERMISSIONS } from '../_shared/permissions.ts';
import { ScheduleRemindersSchema } from '../_shared/schemas/reminders.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createResponse } from '../_shared/response.ts';

// Helper function to add random jitter to a date
function addJitter(date: Date, maxMinutes: number): Date {
  const jitterMinutes = Math.floor(Math.random() * (maxMinutes * 2 + 1)) - maxMinutes;
  const jitteredDate = new Date(date);
  jitteredDate.setMinutes(jitteredDate.getMinutes() + jitterMinutes);
  return jitteredDate;
}

// Reminder service class
class ReminderService {
  constructor(private supabaseClient: any, private user: any) {}

  async scheduleReminders(data: any) {
    const { session_id, session_date, topic } = data;

    console.log(`Scheduling SRS reminders for session: ${session_id}, user: ${this.user.id}`);

    // SECURITY: Verify the user owns the study session
    const { error: checkError } = await this.supabaseClient
      .from('study_sessions')
      .select('id')
      .eq('id', session_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) {
      throw new AppError('Study session not found or access denied.', 404, 'NOT_FOUND');
    }

    // Check premium permissions for advanced reminder features
    const userPermissions = await isPremium(this.supabaseClient, this.user.id);
    const maxReminders = userPermissions.includes(PERMISSIONS.ADVANCED_REMINDERS) ? 10 : 3;

    // Define SRS intervals (in days)
    const srsIntervals = [1, 3, 7, 14, 30, 90]; // Days for spaced repetition
    const sessionDate = new Date(session_date);

    // Create reminders for each SRS interval
    const reminders = [];
    for (let i = 0; i < Math.min(srsIntervals.length, maxReminders); i++) {
      const reminderDate = new Date(sessionDate);
      reminderDate.setDate(reminderDate.getDate() + srsIntervals[i]);
      
      // Add jitter to prevent all reminders from firing at once
      const jitteredDate = addJitter(reminderDate, 30); // ±30 minutes jitter

      reminders.push({
        user_id: this.user.id,
        study_session_id: session_id,
        reminder_time: jitteredDate.toISOString(),
        reminder_type: 'srs_review',
        day_number: srsIntervals[i],
        completed: false,
        title: `Review: ${topic}`,
        message: `Time to review your study session: ${topic}`,
      });
    }

    // Insert reminders
    const { data: createdReminders, error: insertError } = await this.supabaseClient
      .from('reminders')
      .insert(reminders)
      .select();

    if (insertError) {
      throw new AppError(insertError.message, 500, 'DB_INSERT_ERROR');
    }

    console.log(`Created ${createdReminders.length} SRS reminders for session ${session_id}`);
    return createdReminders;
  }

  async cancelReminder(data: any) {
    const { reminder_id } = data;

    console.log(`Canceling reminder: ${reminder_id} for user: ${this.user.id}`);

    // SECURITY: Verify ownership
    const { error: checkError } = await this.supabaseClient
      .from('reminders')
      .select('id')
      .eq('id', reminder_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) {
      throw new AppError('Reminder not found or access denied.', 404, 'NOT_FOUND');
    }

    // Cancel the reminder
    const { error: deleteError } = await this.supabaseClient
      .from('reminders')
      .update({ 
        cancelled: true,
        cancelled_at: new Date().toISOString()
      })
      .eq('id', reminder_id);

    if (deleteError) {
      throw new AppError(deleteError.message, 500, 'DB_UPDATE_ERROR');
    }

    return { success: true, message: 'Reminder cancelled successfully' };
  }

  async cancelAllReminders(data: any) {
    const { item_id, item_type } = data;

    console.log(`Canceling all reminders for ${item_type}: ${item_id} for user: ${this.user.id}`);

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
        throw new AppError('Invalid item type', 400, 'INVALID_INPUT');
    }

    if (ownershipCheck.error) {
      throw new AppError('Item not found or access denied.', 404, 'NOT_FOUND');
    }

    // Cancel all reminders for this item
    const { error: updateError } = await this.supabaseClient
      .from('reminders')
      .update({ 
        cancelled: true,
        cancelled_at: new Date().toISOString()
      })
      .eq(`${item_type}_id`, item_id)
      .eq('user_id', this.user.id)
      .eq('cancelled', false);

    if (updateError) {
      throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
    }

    return { success: true, message: 'All reminders cancelled successfully' };
  }

  async listReminders() {
    const { data: reminders, error } = await this.supabaseClient
      .from('reminders')
      .select(`
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
      `)
      .eq('user_id', this.user.id)
      .eq('cancelled', false)
      .order('reminder_time', { ascending: true });

    if (error) {
      throw new AppError(error.message, 500, 'DB_QUERY_ERROR');
    }

    return reminders;
  }

  async processDueReminders() {
    const now = new Date().toISOString();
    
    // Get due reminders
    const { data: dueReminders, error: fetchError } = await this.supabaseClient
      .from('reminders')
      .select(`
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
      `)
      .eq('user_id', this.user.id)
      .eq('cancelled', false)
      .eq('completed', false)
      .lte('reminder_time', now);

    if (fetchError) {
      throw new AppError(fetchError.message, 500, 'DB_QUERY_ERROR');
    }

    // Process each due reminder
    const processedReminders = [];
    for (const reminder of dueReminders) {
      // Mark as completed
      const { error: updateError } = await this.supabaseClient
        .from('reminders')
        .update({
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', reminder.id);

      if (updateError) {
        console.error(`Failed to mark reminder ${reminder.id} as completed:`, updateError);
        continue;
      }

      processedReminders.push({
        ...reminder,
        completed: true,
        completed_at: new Date().toISOString()
      });
    }

    return {
      processed_count: processedReminders.length,
      reminders: processedReminders
    };
  }

  async updateReminder(reminderId: string, data: any) {
    console.log(`Updating reminder: ${reminderId} for user: ${this.user.id}`);

    // SECURITY: Verify ownership
    const { error: checkError } = await this.supabaseClient
      .from('reminders')
      .select('id')
      .eq('id', reminderId)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) {
      throw new AppError('Reminder not found or access denied.', 404, 'NOT_FOUND');
    }

    // Update the reminder
    const { data: updatedReminder, error: updateError } = await this.supabaseClient
      .from('reminders')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', reminderId)
      .select()
      .single();

    if (updateError) {
      throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
    }

    return updatedReminder;
  }
}

// Main handler
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1]; // Get the last part as action

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return createResponse({ error: 'Unauthorized' }, 401);
    }

    // Create reminder service
    const reminderService = new ReminderService(supabaseClient, user);

    // Route to appropriate handler
    switch (action) {
      case 'schedule':
        const scheduleData = await req.json();
        const scheduledReminders = await reminderService.scheduleReminders(scheduleData);
        return createResponse({ data: scheduledReminders }, 201);

      case 'cancel':
        const cancelData = await req.json();
        const cancelResult = await reminderService.cancelReminder(cancelData);
        return createResponse({ data: cancelResult }, 200);

      case 'cancel-all':
        const cancelAllData = await req.json();
        const cancelAllResult = await reminderService.cancelAllReminders(cancelAllData);
        return createResponse({ data: cancelAllResult }, 200);

      case 'list':
        const reminders = await reminderService.listReminders();
        return createResponse({ data: reminders }, 200);

      case 'process':
        const processResult = await reminderService.processDueReminders();
        return createResponse({ data: processResult }, 200);

      case 'update':
        const reminderId = pathParts[pathParts.length - 2]; // Get ID from path
        const updateData = await req.json();
        const updatedReminder = await reminderService.updateReminder(reminderId, updateData);
        return createResponse({ data: updatedReminder }, 200);

      default:
        return createResponse({ error: 'Invalid action' }, 404);
    }

  } catch (error) {
    console.error('Reminder system error:', error);
    return createResponse({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, 500);
  }
});
