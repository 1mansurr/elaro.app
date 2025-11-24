import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createResponse, errorResponse } from '../_shared/response.ts';
import {
  AuthenticatedRequest,
  AppError,
  ERROR_CODES,
} from '../_shared/function-handler.ts';
import { wrapOldHandler, handleDbError } from '../api-v2/_handler-utils.ts';
import {
  SendNotificationSchema,
  ScheduleNotificationSchema,
  CancelNotificationSchema,
} from '../_shared/schemas/notification.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { sendPushNotification as sendExpoPushNotification } from '../_shared/send-push-notification.ts';
import {
  generateDeduplicationKey,
  getUserNotificationPreferences,
  canSendNotification,
} from '../_shared/notification-helpers.ts';
import { sendUnifiedNotification } from '../_shared/unified-notification-sender.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

// Consolidated Notification System - Handles all notification operations
serve(async req => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    // Route to appropriate handler
    const handler = getHandler(action);
    if (!handler) {
      return errorResponse(
        new AppError(
          'Invalid notification action',
          404,
          ERROR_CODES.DB_NOT_FOUND,
        ),
      );
    }

    // Handler is already wrapped with createAuthenticatedHandler, just call it
    return await handler(req);
  } catch (error) {
    const traceContext = extractTraceContext(req);
    await logger.error(
      'Notification system error',
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
function getHandler(action: string | null) {
  const handlers: Record<string, Function> = {
    send: wrapOldHandler(
      handleSendNotification,
      'notification-send',
      SendNotificationSchema,
      true,
    ),
    schedule: wrapOldHandler(
      handleScheduleNotification,
      'notification-schedule',
      ScheduleNotificationSchema,
      true,
    ),
    cancel: wrapOldHandler(
      handleCancelNotification,
      'notification-cancel',
      CancelNotificationSchema,
      true,
    ),
    process: wrapOldHandler(
      handleProcessNotifications,
      'notification-process',
      undefined,
      false,
    ),
    'daily-summary': wrapOldHandler(
      handleDailySummary,
      'notification-daily-summary',
      undefined,
      false,
    ),
    'evening-capture': wrapOldHandler(
      handleEveningCapture,
      'notification-evening-capture',
      undefined,
      false,
    ),
    welcome: wrapOldHandler(
      handleWelcomeNotification,
      'notification-welcome',
      undefined,
      false,
    ),
    reminder: wrapOldHandler(
      handleReminderNotification,
      'notification-reminder',
      undefined,
      false,
    ),
  };

  return action ? handlers[action] : undefined;
}

// Handler functions - All use AuthenticatedRequest
async function handleSendNotification({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const { user_id, title, body: notificationBody, type, data } = body;

  // Verify user can send notification (either to themselves or admin)
  if (user_id !== user.id) {
    // TODO: Check if user is admin here if needed
    throw new AppError(
      'You can only send notifications to yourself',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  // Generate deduplication key and check for duplicates
  const itemId = data?.itemId || data?.assignment_id || data?.lecture_id;
  const dedupKey = generateDeduplicationKey(user_id, type || 'custom', itemId);

  // Check if notification was recently sent (within last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentDelivery } = await supabaseClient
    .from('notification_deliveries')
    .select('id')
    .eq('user_id', user_id)
    .eq('notification_type', type || 'custom')
    .gte('sent_at', oneHourAgo)
    .limit(1)
    .single();

  if (recentDelivery) {
    // Check if metadata matches (same itemId if present)
    const { data: deliveryDetails } = await supabaseClient
      .from('notification_deliveries')
      .select('metadata, title, body')
      .eq('id', recentDelivery.id)
      .single();

    // If same itemId and same type, likely a duplicate
    if (
      deliveryDetails?.metadata?.itemId === itemId ||
      (deliveryDetails?.title === title &&
        deliveryDetails?.body === notificationBody)
    ) {
      return {
        id: recentDelivery.id,
        message: 'Notification already sent recently',
        duplicate: true,
      };
    }
  }

  // Create notification record
  const { data: notification, error } = await supabaseClient
    .from('notifications')
    .insert({
      user_id,
      title,
      body: notificationBody,
      type,
      data,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) handleDbError(error);

  // Check preferences before sending
  const prefs = await getUserNotificationPreferences(supabaseClient, user_id);
  if (!prefs || !canSendNotification(prefs, type || 'custom')) {
    return {
      id: notification.id,
      message: 'Notification blocked by user preferences or quiet hours',
      blocked: true,
    };
  }

  // Send via unified sender (respects preferences and supports email)
  // Pass preferences to avoid refetch in unified sender
  const result = await sendUnifiedNotification(supabaseClient, {
    userId: user_id,
    notificationType: type || 'custom',
    title,
    body: notificationBody,
    emailSubject: title,
    emailContent: `<h2>${title}</h2><p>${notificationBody}</p>`,
    data,
    options: {
      priority: 'high',
    },
    preferences: prefs, // Pass to avoid refetch
  });

  if (!result.pushSent && !result.emailSent) {
    return {
      id: notification.id,
      message: 'Notification blocked by preferences',
      blocked: true,
    };
  }

  return notification;
}

async function handleScheduleNotification({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const {
    user_id,
    title,
    body: notificationBody,
    reminder_time,
    type,
    data,
  } = body;

  // Verify user can schedule notification for this user_id
  if (user_id !== user.id) {
    throw new AppError(
      'You can only schedule notifications for yourself',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  const { data: reminder, error } = await supabaseClient
    .from('reminders')
    .insert({
      user_id,
      title,
      body: notificationBody,
      reminder_time,
      type,
      data,
      completed: false,
    })
    .select()
    .single();

  if (error) handleDbError(error);
  return reminder;
}

async function handleCancelNotification({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const { reminder_id } = body;

  // Verify user owns this reminder
  const { data: existingReminder, error: checkError } = await supabaseClient
    .from('reminders')
    .select('user_id')
    .eq('id', reminder_id)
    .single();

  if (checkError) handleDbError(checkError);
  if (existingReminder.user_id !== user.id) {
    throw new AppError(
      'You can only cancel your own reminders',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  const { data, error } = await supabaseClient
    .from('reminders')
    .update({ completed: true })
    .eq('id', reminder_id)
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleProcessNotifications({
  supabaseClient,
}: AuthenticatedRequest) {
  // This is typically a scheduled/cron job - no user auth required
  // Get pending reminders
  const { data: reminders, error } = await supabaseClient
    .from('reminders')
    .select('*')
    .eq('completed', false)
    .lte('reminder_time', new Date().toISOString());

  if (error) handleDbError(error);

  // Process each reminder
  const results = [];
  for (const reminder of reminders || []) {
    try {
      // Check preferences before sending
      const prefs = await getUserNotificationPreferences(
        supabaseClient,
        reminder.user_id,
      );
      if (!prefs || !canSendNotification(prefs, reminder.type || 'reminder')) {
        // Skip but mark as processed
        await supabaseClient
          .from('reminders')
          .update({ completed: true, processed_at: new Date().toISOString() })
          .eq('id', reminder.id);
        results.push({
          success: false,
          reminder_id: reminder.id,
          reason: 'preferences_disabled',
        });
        continue;
      }

      // Send via unified sender (respects preferences and supports email)
      // Pass preferences to avoid refetch in unified sender
      const result = await sendUnifiedNotification(supabaseClient, {
        userId: reminder.user_id,
        notificationType: reminder.type || 'reminder',
        title: reminder.title,
        body: reminder.body,
        emailSubject: `Reminder: ${reminder.title}`,
        emailContent: `<h2>${reminder.title}</h2><p>${reminder.body}</p>`,
        data: reminder.data,
        options: {
          priority: 'high',
        },
        preferences: prefs, // Pass to avoid refetch
      });

      if (result.pushSent || result.emailSent) {
        await supabaseClient
          .from('reminders')
          .update({ completed: true, processed_at: new Date().toISOString() })
          .eq('id', reminder.id);
        results.push({ success: true, reminder_id: reminder.id });
      } else {
        results.push({
          success: false,
          reminder_id: reminder.id,
          reason: 'send_failed',
        });
      }
    } catch (error) {
      results.push({
        success: false,
        reminder_id: reminder.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

async function handleDailySummary({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const { user_id } = body || {};
  const targetUserId = user_id || user.id;

  // Verify user can access this summary
  if (targetUserId !== user.id) {
    throw new AppError(
      'You can only get your own daily summary',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  // Check preferences before processing
  const prefs = await getUserNotificationPreferences(
    supabaseClient,
    targetUserId,
  );
  if (!prefs || !canSendNotification(prefs, 'daily_summary')) {
    throw new AppError(
      'Daily summary notifications are disabled',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  // Get user's data for the day
  const today = new Date().toISOString().split('T')[0];
  const todayEnd = new Date(
    new Date(today).getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const [assignmentsRes, lecturesRes, studySessionsRes] = await Promise.all([
    supabaseClient
      .from('assignments')
      .select('id')
      .eq('user_id', targetUserId)
      .gte('due_date', today)
      .lt('due_date', todayEnd),
    supabaseClient
      .from('lectures')
      .select('id')
      .eq('user_id', targetUserId)
      .gte('start_time', today)
      .lt('start_time', todayEnd),
    supabaseClient
      .from('study_sessions')
      .select('id')
      .eq('user_id', targetUserId)
      .gte('session_date', today)
      .lt('session_date', todayEnd),
  ]);

  const summary = {
    assignments: assignmentsRes.data?.length || 0,
    lectures: lecturesRes.data?.length || 0,
    studySessions: studySessionsRes.data?.length || 0,
  };

  const title = 'Daily Summary';
  const notificationBody = `You have ${summary.assignments} assignments, ${summary.lectures} lectures, and completed ${summary.studySessions} study sessions today.`;

  // Send via unified sender (respects preferences and supports email)
  // Pass preferences to avoid refetch in unified sender
  const emailSubject = 'Your Daily ELARO Summary';
  const emailContent = `
    <h2>Daily Summary</h2>
    <p>${notificationBody}</p>
    <ul>
      <li><strong>${summary.assignments}</strong> assignments due</li>
      <li><strong>${summary.lectures}</strong> lectures scheduled</li>
      <li><strong>${summary.studySessions}</strong> study sessions completed</li>
    </ul>
  `;

  const result = await sendUnifiedNotification(supabaseClient, {
    userId: targetUserId,
    notificationType: 'daily_summary',
    title,
    body: notificationBody,
    emailSubject,
    emailContent,
    data: summary,
    options: {
      priority: 'normal',
      categoryId: 'daily_summary',
    },
    preferences: prefs, // Pass to avoid refetch
  });

  if (!result.pushSent && !result.emailSent) {
    throw new AppError(
      'Failed to send daily summary',
      500,
      ERROR_CODES.DELIVERY_FAILED,
    );
  }

  return summary;
}

async function handleEveningCapture({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const { user_id } = body || {};
  const targetUserId = user_id || user.id;

  // Verify user can send this notification
  if (targetUserId !== user.id) {
    throw new AppError(
      'You can only send evening capture to yourself',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  // Check preferences before sending
  const prefs = await getUserNotificationPreferences(
    supabaseClient,
    targetUserId,
  );
  if (!prefs || !canSendNotification(prefs, 'evening_capture')) {
    throw new AppError(
      'Evening capture notifications are disabled',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  const title = 'Evening Reflection';
  const notificationBody =
    'How did your study session go today? Take a moment to reflect on your progress.';

  // Send via unified sender (respects preferences and supports email)
  // Pass preferences to avoid refetch in unified sender
  const result = await sendUnifiedNotification(supabaseClient, {
    userId: targetUserId,
    notificationType: 'evening_capture',
    title,
    body: notificationBody,
    emailSubject: title,
    emailContent: `<h2>${title}</h2><p>${notificationBody}</p>`,
    data: { type: 'evening_capture' },
    options: {
      priority: 'normal',
    },
    preferences: prefs, // Pass to avoid refetch
  });

  if (!result.pushSent && !result.emailSent) {
    throw new AppError(
      'Failed to send evening capture',
      500,
      ERROR_CODES.DELIVERY_FAILED,
    );
  }

  return { sent: result.pushSent || result.emailSent };
}

async function handleWelcomeNotification({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const { user_id, user_name } = body;

  // Verify user can send welcome notification (typically admin or system)
  // For now, allow if it's for themselves or if they're sending it (system use case)
  if (user_id && user_id !== user.id) {
    // TODO: Check admin status if needed
    throw new AppError(
      'You can only send welcome notifications for yourself',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  const title = `Welcome to ELARO, ${user_name || 'User'}!`;
  const notificationBody =
    "Get started by creating your first course and assignment. We're here to help you succeed!";

  const targetUserId = user_id || user.id;

  // Check preferences (system notifications respect master toggle and do_not_disturb, but bypass quiet hours)
  const prefs = await getUserNotificationPreferences(
    supabaseClient,
    targetUserId,
  );
  if (prefs?.master_toggle === false || prefs?.do_not_disturb === true) {
    return {
      sent: false,
      message: 'Notifications disabled by user preferences',
    };
  }

  // For system notifications (like welcome), bypass quiet hours by using sendPushNotification directly
  // This matches the behavior of subscription_ended and grace_period_warning
  const { data: devices } = await supabaseClient
    .from('user_devices')
    .select('push_token')
    .eq('user_id', targetUserId);

  const pushTokens = devices?.map(d => d.push_token).filter(Boolean) || [];

  if (pushTokens.length > 0) {
    await sendExpoPushNotification(
      supabaseClient,
      pushTokens,
      title,
      notificationBody,
      { type: 'welcome' },
    );

    // Record delivery for consistency
    await supabaseClient.from('notification_deliveries').insert({
      user_id: targetUserId,
      notification_type: 'welcome',
      title,
      body: notificationBody,
      sent_at: new Date().toISOString(),
      device_token: pushTokens[0] || null,
      metadata: { type: 'welcome' },
      expo_status: 'ok',
    });
  }

  return { sent: pushTokens.length > 0 };
}

async function handleReminderNotification({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const { user_id, assignment_id, lecture_id } = body;

  // Verify user can send reminder for this user_id
  if (user_id !== user.id) {
    throw new AppError(
      'You can only send reminders for yourself',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  let title = 'Reminder';
  let notificationBody = 'You have an upcoming task';
  let notificationType = 'reminder';

  if (assignment_id) {
    const { data: assignment, error } = await supabaseClient
      .from('assignments')
      .select('title, due_date')
      .eq('id', assignment_id)
      .eq('user_id', user_id) // Ensure ownership
      .single();

    if (error) handleDbError(error);

    if (assignment) {
      title = 'Assignment Reminder';
      notificationBody = `Don't forget: ${assignment.title} is due soon!`;
      notificationType = 'assignment';
    }
  }

  if (lecture_id) {
    const { data: lecture, error } = await supabaseClient
      .from('lectures')
      .select('lecture_name, start_time')
      .eq('id', lecture_id)
      .eq('user_id', user_id) // Ensure ownership
      .single();

    if (error) handleDbError(error);

    if (lecture) {
      title = 'Lecture Reminder';
      notificationBody = `Upcoming: ${lecture.lecture_name} starts soon!`;
      notificationType = 'lecture';
    }
  }

  // Check preferences before sending
  const prefs = await getUserNotificationPreferences(supabaseClient, user_id);
  if (!prefs || !canSendNotification(prefs, notificationType)) {
    throw new AppError(
      `Reminder notifications are disabled for type: ${notificationType}`,
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  // Send via unified sender (respects preferences and supports email)
  // Pass preferences to avoid refetch in unified sender
  const result = await sendUnifiedNotification(supabaseClient, {
    userId: user_id,
    notificationType,
    title,
    body: notificationBody,
    emailSubject: `Reminder: ${title}`,
    emailContent: `<h2>${title}</h2><p>${notificationBody}</p>`,
    data: { assignment_id, lecture_id },
    options: {
      priority: 'high',
      categoryId: notificationType,
    },
    preferences: prefs, // Pass to avoid refetch
  });

  if (!result.pushSent && !result.emailSent) {
    throw new AppError(
      'Failed to send reminder',
      500,
      ERROR_CODES.DELIVERY_FAILED,
    );
  }

  return { sent: result.pushSent || result.emailSent };
}
