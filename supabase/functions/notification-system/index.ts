// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/response.ts';
import { AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
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

// Consolidated Notification System - Handles all notification operations
serve(async (req: Request) => {
  const origin = req.headers.get('Origin');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1]; // Last part of path
    const method = req.method;

    // Extract URL params for handlers that need them
    const urlParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      urlParams[key] = value;
    });

    // Handle RESTful routes (GET /queue/:id, DELETE /queue/:id)
    if (action === 'queue' && method === 'GET') {
      // GET /queue - list queue items
      const handler = getHandler('queue');
      if (handler) {
        // Inject URL params into request body for handler
        const body = await req.json().catch(() => ({}));
        const modifiedReq = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: JSON.stringify({ ...body, method: 'GET', urlParams }),
        });
        return await handler(modifiedReq);
      }
    } else if (action === 'queue' && method === 'POST') {
      // POST /queue - add to queue
      const handler = getHandler('queue');
      if (handler) {
        const body = await req.json().catch(() => ({}));
        const modifiedReq = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: JSON.stringify({ ...body, method: 'POST', urlParams }),
        });
        return await handler(modifiedReq);
      }
    } else if (
      pathParts.length > 2 &&
      pathParts[pathParts.length - 2] === 'queue' &&
      method === 'DELETE'
    ) {
      // DELETE /queue/:id - remove from queue
      const queueId = pathParts[pathParts.length - 1];
      const handler = getHandler('queue');
      if (handler) {
        // Modify request to include queue_id in body
        const body = await req.json().catch(() => ({}));
        const modifiedReq = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: JSON.stringify({
            ...body,
            queue_id: queueId,
            method: 'DELETE',
            urlParams,
          }),
        });
        return await handler(modifiedReq);
      }
    }

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

    // For GET requests to preferences/history/unread-count, inject method and URL params
    if (
      (action === 'preferences' ||
        action === 'history' ||
        action === 'unread-count' ||
        action === 'queue') &&
      method === 'GET'
    ) {
      const body = await req.json().catch(() => ({}));
      const modifiedReq = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify({ ...body, method: 'GET', urlParams }),
      });
      return await handler(modifiedReq);
    }

    // For PUT requests to preferences, inject method
    if (action === 'preferences' && method === 'PUT') {
      const body = await req.json().catch(() => ({}));
      const modifiedReq = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify({ ...body, method: 'PUT', urlParams }),
      });
      return await handler(modifiedReq);
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
type HandlerFunction = (req: Request) => Promise<Response>;

function getHandler(action: string | null) {
  const handlers: Record<string, HandlerFunction> = {
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
    // New endpoints for Phase 2 migration
    preferences: wrapOldHandler(
      handlePreferences,
      'notification-preferences',
      undefined,
      true,
    ),
    history: wrapOldHandler(
      handleHistory,
      'notification-history',
      undefined,
      true,
    ),
    'unread-count': wrapOldHandler(
      handleUnreadCount,
      'notification-unread-count',
      undefined,
      true,
    ),
    'mark-read': wrapOldHandler(
      handleMarkRead,
      'notification-mark-read',
      undefined,
      true,
    ),
    queue: wrapOldHandler(handleQueue, 'notification-queue', undefined, true),
  };

  return action ? handlers[action] : undefined;
}

// Handler functions - All use AuthenticatedRequest
async function handleSendNotification({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  // PASS 2: Validate body is object before destructuring
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(
      'Request body must be an object',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  // PASS 2: Extract and validate user_id (never trust client-provided IDs)
  const bodyUser_id = body.user_id;
  if (bodyUser_id !== undefined && bodyUser_id !== null) {
    // Validate format if provided
    if (typeof bodyUser_id !== 'string') {
      throw new AppError(
        'user_id must be a string',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'user_id', message: 'user_id must be a string type' },
      );
    }
    // Validate UUID format if provided
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        bodyUser_id,
      )
    ) {
      throw new AppError(
        'Invalid user_id format',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'user_id', message: 'user_id must be a valid UUID' },
      );
    }
    // CRITICAL: Never trust client-provided user_id - must match authenticated user
    if (bodyUser_id !== user.id) {
      // TODO(@admin): Check if user is admin here if needed
      throw new AppError(
        'You can only send notifications to yourself',
        403,
        ERROR_CODES.FORBIDDEN,
      );
    }
  }
  // Use authenticated user.id (never use client-provided user_id)
  const user_id = user.id;

  const { title, body: notificationBody, type, data } = body;

  // Generate deduplication key and check for duplicates
  const dataTyped = data as { itemId?: string; assignment_id?: string; lecture_id?: string } | undefined;
  let itemIdString: string = '';
  if (dataTyped?.itemId && typeof dataTyped.itemId === 'string') {
    itemIdString = dataTyped.itemId;
  } else if (dataTyped?.assignment_id && typeof dataTyped.assignment_id === 'string') {
    itemIdString = dataTyped.assignment_id;
  } else if (dataTyped?.lecture_id && typeof dataTyped.lecture_id === 'string') {
    itemIdString = dataTyped.lecture_id;
  }
  // Pass undefined if empty string, or the actual string value
  const notificationType = typeof type === 'string' ? type : 'custom';
  const _dedupKey = generateDeduplicationKey(user_id, notificationType, itemIdString || undefined);

  // Check if notification was recently sent (within last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentDelivery } = await supabaseClient
    .from('notification_deliveries')
    .select('id')
    .eq('user_id', user_id)
    .eq('notification_type', notificationType)
    .gte('sent_at', oneHourAgo)
    .limit(1)
    .single();

  const recentDeliveryTyped = recentDelivery as { id: string } | null;
  if (recentDeliveryTyped) {
    // Check if metadata matches (same itemId if present)
    const { data: deliveryDetails } = await supabaseClient
      .from('notification_deliveries')
      .select('metadata, title, body')
      .eq('id', recentDeliveryTyped.id)
      .single();

    const deliveryDetailsTyped = deliveryDetails as {
      metadata?: { itemId?: string };
      title?: string;
      body?: string;
    } | null;

    // If same itemId and same type, likely a duplicate
    if (
      deliveryDetailsTyped?.metadata?.itemId === itemIdString ||
      (deliveryDetailsTyped?.title === title &&
        deliveryDetailsTyped?.body === notificationBody)
    ) {
      return {
        id: recentDeliveryTyped.id,
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
      type: notificationType,
      data,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) handleDbError(error);

  const notificationTyped = notification as { id: string } | null;
  if (!notificationTyped) {
    throw new AppError('Failed to create notification', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  // Check preferences before sending
  const prefs = await getUserNotificationPreferences(supabaseClient, user_id);
  if (!prefs || !canSendNotification(prefs, notificationType)) {
    return {
      id: notificationTyped.id,
      message: 'Notification blocked by user preferences or quiet hours',
      blocked: true,
    };
  }

  // Send via unified sender (respects preferences and supports email)
  // Pass preferences to avoid refetch in unified sender
  const result = await sendUnifiedNotification(supabaseClient, {
    userId: user_id,
    notificationType: notificationType,
    title: title as string,
    body: notificationBody as string,
    emailSubject: title as string,
    emailContent: `<h2>${title}</h2><p>${notificationBody}</p>`,
    data: data as object | undefined,
    options: {
      priority: 'high',
    },
    preferences: prefs, // Pass to avoid refetch
  });

  if (!result.pushSent && !result.emailSent) {
    return {
      id: notificationTyped.id,
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
  const existingReminderTyped = existingReminder as { user_id: string } | null;
  if (!existingReminderTyped || existingReminderTyped.user_id !== user.id) {
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
  const results: Array<{
    success: boolean;
    reminder_id: string;
    reason?: string;
    error?: string;
  }> = [];
  const remindersArray = Array.isArray(reminders) ? reminders : [];
  for (const reminder of remindersArray) {
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
  // PASS 2: Validate body is object before accessing properties
  if (body && (typeof body !== 'object' || Array.isArray(body))) {
    throw new AppError(
      'Request body must be an object',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  // PASS 2: Extract and validate user_id (never trust client-provided IDs)
  const bodyUser_id = body?.user_id;
  if (bodyUser_id !== undefined && bodyUser_id !== null) {
    // Validate format if provided
    if (typeof bodyUser_id !== 'string') {
      throw new AppError(
        'user_id must be a string',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'user_id', message: 'user_id must be a string type' },
      );
    }
    // Validate UUID format if provided
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        bodyUser_id,
      )
    ) {
      throw new AppError(
        'Invalid user_id format',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'user_id', message: 'user_id must be a valid UUID' },
      );
    }
    // CRITICAL: Never trust client-provided user_id - must match authenticated user
    if (bodyUser_id !== user.id) {
      throw new AppError(
        'You can only get your own daily summary',
        403,
        ERROR_CODES.FORBIDDEN,
      );
    }
  }
  // Use authenticated user.id (never use client-provided user_id)
  const targetUserId = user.id;

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

  const assignmentsData = assignmentsRes.data as Array<unknown> | null;
  const lecturesData = lecturesRes.data as Array<unknown> | null;
  const studySessionsData = studySessionsRes.data as Array<unknown> | null;
  const summary = {
    assignments: assignmentsData?.length || 0,
    lectures: lecturesData?.length || 0,
    studySessions: studySessionsData?.length || 0,
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
      ERROR_CODES.INTERNAL_ERROR,
    );
  }

  return summary;
}

async function handleEveningCapture({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  // PASS 2: Validate body is object before accessing properties
  if (body && (typeof body !== 'object' || Array.isArray(body))) {
    throw new AppError(
      'Request body must be an object',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  // PASS 2: Extract and validate user_id (never trust client-provided IDs)
  const bodyUser_id = body?.user_id;
  if (bodyUser_id !== undefined && bodyUser_id !== null) {
    // Validate format if provided
    if (typeof bodyUser_id !== 'string') {
      throw new AppError(
        'user_id must be a string',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'user_id', message: 'user_id must be a string type' },
      );
    }
    // Validate UUID format if provided
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        bodyUser_id,
      )
    ) {
      throw new AppError(
        'Invalid user_id format',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'user_id', message: 'user_id must be a valid UUID' },
      );
    }
    // CRITICAL: Never trust client-provided user_id - must match authenticated user
    if (bodyUser_id !== user.id) {
      throw new AppError(
        'You can only send evening capture to yourself',
        403,
        ERROR_CODES.FORBIDDEN,
      );
    }
  }
  // Use authenticated user.id (never use client-provided user_id)
  const targetUserId = user.id;

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
      ERROR_CODES.INTERNAL_ERROR,
    );
  }

  return { sent: result.pushSent || result.emailSent };
}

async function handleWelcomeNotification({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  // PASS 2: Validate body is object before destructuring
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(
      'Request body must be an object',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  // PASS 2: Extract and validate user_id (never trust client-provided IDs)
  const bodyUser_id = body.user_id;
  if (bodyUser_id !== undefined && bodyUser_id !== null) {
    // Validate format if provided
    if (typeof bodyUser_id !== 'string') {
      throw new AppError(
        'user_id must be a string',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'user_id', message: 'user_id must be a string type' },
      );
    }
    // Validate UUID format if provided
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        bodyUser_id,
      )
    ) {
      throw new AppError(
        'Invalid user_id format',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'user_id', message: 'user_id must be a valid UUID' },
      );
    }
    // CRITICAL: Never trust client-provided user_id - must match authenticated user
    if (bodyUser_id !== user.id) {
      // TODO(@admin): Check admin status if needed
      throw new AppError(
        'You can only send welcome notifications for yourself',
        403,
        ERROR_CODES.FORBIDDEN,
      );
    }
  }
  // Use authenticated user.id (never use client-provided user_id)
  const user_id = user.id;
  const { user_name } = body;

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

  const pushTokens = ((devices as Array<{ push_token?: string }> | null)?.map((d: { push_token?: string }) => d.push_token).filter((token): token is string => typeof token === 'string') || []) as string[];

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
  // PASS 2: Validate body is object before destructuring
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(
      'Request body must be an object',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  // PASS 2: Extract and validate user_id (never trust client-provided IDs)
  const bodyUser_id = body.user_id;
  if (bodyUser_id !== undefined && bodyUser_id !== null) {
    // Validate format if provided
    if (typeof bodyUser_id !== 'string') {
      throw new AppError(
        'user_id must be a string',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'user_id', message: 'user_id must be a string type' },
      );
    }
    // Validate UUID format if provided
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        bodyUser_id,
      )
    ) {
      throw new AppError(
        'Invalid user_id format',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'user_id', message: 'user_id must be a valid UUID' },
      );
    }
    // CRITICAL: Never trust client-provided user_id - must match authenticated user
    if (bodyUser_id !== user.id) {
      throw new AppError(
        'You can only send reminders for yourself',
        403,
        ERROR_CODES.FORBIDDEN,
      );
    }
  }
  // Use authenticated user.id (never use client-provided user_id)
  const user_id = user.id;
  const { assignment_id, lecture_id } = body;

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

    const assignmentTyped = assignment as { title?: string } | null;
    if (assignmentTyped) {
      title = 'Assignment Reminder';
      notificationBody = `Don't forget: ${assignmentTyped.title} is due soon!`;
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

    const lectureTyped = lecture as { lecture_name?: string } | null;
    if (lectureTyped) {
      title = 'Lecture Reminder';
      notificationBody = `Upcoming: ${lectureTyped.lecture_name} starts soon!`;
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
      ERROR_CODES.INTERNAL_ERROR,
    );
  }

  return { sent: result.pushSent || result.emailSent };
}

// ============================================================================
// NEW ENDPOINTS FOR PHASE 2 MIGRATION
// ============================================================================

/**
 * GET /preferences - Get user notification preferences
 * PUT /preferences - Update user notification preferences
 */
async function handlePreferences({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const method = (body as Record<string, unknown>)?.method || 'GET';
  const preferences = body as Record<string, unknown>;

  if (method === 'GET' || method === 'get') {
    // Get preferences
    const { data, error } = await supabaseClient
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      const errorTyped = error as { code?: string };
      if (errorTyped.code !== 'PGRST116') {
        // Not found is OK, return defaults
        handleDbError(error);
      }
    }

    if (!data) {
      // Return default preferences
      return {
        master_toggle: true,
        quiet_hours_enabled: false,
        quiet_hours_start: null,
        quiet_hours_end: null,
        do_not_disturb: false,
        assignment_notifications: true,
        lecture_notifications: true,
        study_session_notifications: true,
        reminder_notifications: true,
        daily_summary_enabled: true,
        evening_capture_enabled: true,
        email_notifications: false,
        push_notifications: true,
      };
    }

    return data;
  } else {
    // Update preferences
    delete preferences.method; // Remove method if present

    // Check if preferences exist, then update or insert
    const { data: existing } = await supabaseClient
      .from('notification_preferences')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    let data, error;
    if (existing) {
      // Update existing preferences
      const result = await supabaseClient
        .from('notification_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Insert new preferences
      const result = await supabaseClient
        .from('notification_preferences')
        .insert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) handleDbError(error);
    return data;
  }
}

/**
 * GET /history - Get notification history
 */
async function handleHistory({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const urlParams = (body as Record<string, unknown>)?.urlParams as Record<string, unknown> | undefined || {};
  const limit = parseInt((urlParams.limit as string | undefined) || '50');
  const offset = parseInt((urlParams.offset as string | undefined) || '0');
  const filter = (urlParams.filter as string | undefined) || 'all';
  const includeRead = (urlParams.includeRead as string | undefined) !== 'false';

  let query = supabaseClient
    .from('notification_deliveries')
    .select('*')
    .eq('user_id', user.id)
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply read filter
  if (!includeRead) {
    query = query.is('opened_at', null);
  }

  // Apply type filter
  if (filter !== 'all') {
    const typeMap: Record<string, string> = {
      assignments: 'assignment',
      lectures: 'lecture',
      study_sessions: 'study_session',
      analytics: 'analytics',
      summaries: 'summary',
    };
    const notificationType = typeMap[filter] || filter;
    query = query.eq('notification_type', notificationType);
  }

  const { data, error } = await query;

  if (error) handleDbError(error);
  return data || [];
}

/**
 * GET /unread-count - Get unread notification count
 */
async function handleUnreadCount({
  user,
  supabaseClient,
}: AuthenticatedRequest) {
  // Use a different approach for count query - remove options parameter
  const query = supabaseClient
    .from('notification_deliveries')
    .select('*')
    .eq('user_id', user.id)
    .is('opened_at', null) as unknown as Promise<{ count: number | null; error: unknown }>;
  
  const result = await query;
  
  const { count, error } = result;

  if (error) handleDbError(error as Error);
  return { count: (count as number | null) || 0 };
}

/**
 * POST /mark-read - Mark notification as read
 */
async function handleMarkRead({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const { notification_id } = body as { notification_id: string };

  if (!notification_id) {
    throw new AppError('notification_id is required', 400, 'VALIDATION_ERROR');
  }

  // Verify ownership
  const { data: notification, error: checkError } = await supabaseClient
    .from('notification_deliveries')
    .select('user_id')
    .eq('id', notification_id)
    .single();

  if (checkError) handleDbError(checkError);
  const notificationTyped = notification as { user_id: string } | null;
  if (!notificationTyped || notificationTyped.user_id !== user.id) {
    throw new AppError(
      'You can only mark your own notifications as read',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  const { data, error } = await supabaseClient
    .from('notification_deliveries')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', notification_id)
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

/**
 * GET /queue - Get notification queue
 * POST /queue - Add to notification queue
 * DELETE /queue/:id - Remove from notification queue
 */
async function handleQueue({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const method = ((body as Record<string, unknown>)?.method as string | undefined) || 'GET';
  const urlParams = ((body as Record<string, unknown>)?.urlParams as Record<string, unknown> | undefined) || {};

  if (method === 'GET' || method === 'get') {
    // Get queue items
    const limit = parseInt((urlParams.limit as string | undefined) || '50');
    const offset = parseInt((urlParams.offset as string | undefined) || '0');
    const status = (urlParams.status as string | undefined) || 'pending';

    let query = supabaseClient
      .from('notification_queue')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_for', { ascending: true })
      .range(offset, offset + limit - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) handleDbError(error);
    return data || [];
  } else if (method === 'POST' || method === 'post') {
    // Add to queue
    const {
      notification_type,
      title,
      body: notificationBody,
      data: notificationData,
      scheduled_for,
      priority,
    } = body as {
      notification_type: string;
      title: string;
      body: string;
      data?: Record<string, unknown>;
      scheduled_for: string;
      priority?: number;
    };

    const { data, error } = await supabaseClient
      .from('notification_queue')
      .insert({
        user_id: user.id,
        notification_type,
        title,
        body: notificationBody,
        data: notificationData,
        scheduled_for,
        priority: priority || 0,
        status: 'pending',
      })
      .select()
      .single();

    if (error) handleDbError(error);
    return data;
  } else if (method === 'DELETE' || method === 'delete') {
    // Remove from queue
    const queueId = (body as Record<string, unknown>)?.queue_id;

    if (!queueId) {
      throw new AppError('queue_id is required', 400, 'VALIDATION_ERROR');
    }

    // Verify ownership
    const { data: queueItem, error: checkError } = await supabaseClient
      .from('notification_queue')
      .select('user_id')
      .eq('id', queueId)
      .single();

    if (checkError) handleDbError(checkError);
    const queueItemTyped = queueItem as { user_id: string } | null;
    if (!queueItemTyped || queueItemTyped.user_id !== user.id) {
      throw new AppError(
        'You can only delete your own queue items',
        403,
        ERROR_CODES.FORBIDDEN,
      );
    }

    const { error } = await supabaseClient
      .from('notification_queue')
      .delete()
      .eq('id', queueId);

    if (error) handleDbError(error);
    return { success: true };
  }

  throw new AppError('Invalid method', 405, 'METHOD_NOT_ALLOWED');
}
