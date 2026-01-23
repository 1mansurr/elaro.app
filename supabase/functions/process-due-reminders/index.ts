// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { sendUnifiedNotification } from '../_shared/unified-notification-sender.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import {
  generateDeduplicationKey,
  getUserNotificationPreferences,
} from '../_shared/notification-helpers.ts';

// This interface defines the shape of the data we expect from our complex query.
interface DueReminder {
  id: string;
  user_id: string;
  title: string;
  body: string;
  reminder_type: string;
  reminder_time?: string;
  session_id?: string;
  assignment_id?: string;
  lecture_id?: string;
  user?: {
    user_devices?: Array<{
      push_token: string;
    }>;
    notification_preferences?: {
      reminders_enabled: boolean;
      srs_reminders_enabled: boolean;
      assignment_reminders_enabled: boolean;
      lecture_reminders_enabled: boolean;
    };
  };
}

// Helper function to generate deep link URLs for reminders
function generateDeepLinkUrl(reminder: DueReminder): string {
  // Map reminder_type to URL path segments
  const typeMap: Record<string, string> = {
    assignment: 'assignment',
    lecture: 'lecture',
    study_session: 'study-session',
    spaced_repetition: 'study-session', // SRS reminders link to study sessions
  };

  const urlType = typeMap[reminder.reminder_type] || 'task';
  const itemId =
    reminder.session_id || reminder.assignment_id || reminder.lecture_id;

  if (!itemId) {
    return 'elaro://home'; // Fallback to home if no ID
  }

  return `elaro://${urlType}/${itemId}`;
}

async function handleProcessDueReminders(supabaseAdmin: SupabaseClient) {
  const traceContext = extractTraceContext(
    new Request('https://cron.internal'),
  );
  const startTime = Date.now();

  await logger.info('Starting due reminders processing job', {}, traceContext);

  const now = new Date().toISOString();
  const lockId = crypto.randomUUID(); // Generate unique lock ID for this run

  // Initialize metrics
  const jobMetrics = {
    job_name: 'process-due-reminders',
    reminders_found: 0,
    reminders_processed: 0,
    notifications_sent: 0,
    notifications_failed: 0,
    errors: [] as string[],
    status: 'success' as 'success' | 'failure' | 'partial',
    metadata: {} as Record<string, unknown>,
    execution_time_ms: 0,
  };

  // Step 1: Clean up stale locks first (older than 10 minutes)
  try {
    const { data: cleanedCount } = await supabaseAdmin.rpc(
      'cleanup_stale_reminder_locks',
    );
    if (cleanedCount && cleanedCount > 0) {
      await logger.info(
        'Cleaned up stale locks',
        { count: cleanedCount },
        traceContext,
      );
    }
  } catch (error) {
    // Non-critical, log and continue
    await logger.warn(
      'Failed to clean stale locks',
      { error: error instanceof Error ? error.message : String(error) },
      traceContext,
    );
  }

  // Step 2: Acquire locks for reminders to process atomically
  const { data: lockedReminders, error: lockError } = await supabaseAdmin.rpc(
    'acquire_reminder_locks',
    {
      p_lock_id: lockId,
      p_stale_threshold_minutes: 10,
    },
  );

  if (lockError) {
    await logger.error(
      'Failed to acquire locks',
      { error: lockError.message },
      traceContext,
    );
    // Continue anyway - might have no reminders to process
  }

  if (!lockedReminders || lockedReminders.length === 0) {
    await logger.info(
      'No reminders to process',
      { reason: 'none_found_or_already_locked' },
      traceContext,
    );
    return {
      success: true,
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
    };
  }

  await logger.info(
    'Acquired locks for reminders',
    { count: lockedReminders.length, lock_id: lockId },
    traceContext,
  );

  // Step 3: Fetch full reminder data with user preferences and devices
  const reminderIds = lockedReminders.map((r: { id: string }) => r.id);
  const { data: dueReminders, error: fetchError } = await supabaseAdmin
    .from('reminders')
    .select(
      `
      id,
      user_id,
      title,
      body,
      reminder_type,
      session_id,
      assignment_id,
      lecture_id,
      user:users (
        user_devices (
          push_token
        ),
        notification_preferences (
          reminders_enabled,
          srs_reminders_enabled,
          assignment_reminders_enabled,
          lecture_reminders_enabled,
          master_toggle,
          do_not_disturb
        )
      )
    `,
    )
    .in('id', reminderIds)
    // Filter based on preferences: master switch must be on AND specific type switch must be on
    .eq('user.notification_preferences.reminders_enabled', true)
    .filter('user.notification_preferences', 'not.is', null) // Ensure preferences exist
    // Master toggle must be enabled
    .eq('user.notification_preferences.master_toggle', true)
    // Do not disturb must be off (false or null)
    .or(
      'user.notification_preferences.do_not_disturb.is.null,user.notification_preferences.do_not_disturb.eq.false',
    )
    // Type-specific checks
    .or(
      'and(reminder_type.eq.spaced_repetition, user.notification_preferences.srs_reminders_enabled.eq.true),' +
        'and(reminder_type.eq.assignment, user.notification_preferences.assignment_reminders_enabled.eq.true),' +
        'and(reminder_type.eq.lecture, user.notification_preferences.lecture_reminders_enabled.eq.true),' +
        // Study session reminders fall under the main reminders toggle
        'and(reminder_type.eq.study_session, user.notification_preferences.reminders_enabled.eq.true)',
    );

  if (fetchError) {
    await logger.error(
      'Failed to fetch locked reminders',
      { error: fetchError.message },
      traceContext,
    );
    // Unlock the reminders we locked but couldn't fetch
    await supabaseAdmin
      .from('reminders')
      .update({
        processing_started_at: null,
        processing_lock_id: null,
      })
      .in('id', reminderIds);
    throw handleDbError(fetchError);
  }

  if (!dueReminders || dueReminders.length === 0) {
    await logger.info(
      'No reminders match user preferences',
      { locked_count: lockedReminders.length },
      traceContext,
    );
    // Unlock reminders that don't match preferences
    await supabaseAdmin
      .from('reminders')
      .update({
        processing_started_at: null,
        processing_lock_id: null,
      })
      .in('id', reminderIds);
    return {
      success: true,
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
    };
  }

  // Step 4: Categorize reminders by how overdue they are and prioritize
  interface CategorizedReminder extends DueReminder {
    hoursOverdue: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }

  const nowTime = new Date(now).getTime();
  const categorizedReminders: CategorizedReminder[] = dueReminders.map(
    (reminder: DueReminder) => {
      const reminderDate = new Date(reminder.reminder_time || now);
      const hoursOverdue =
        (nowTime - reminderDate.getTime()) / (1000 * 60 * 60);

      let priority: 'critical' | 'high' | 'medium' | 'low';
      if (hoursOverdue > 168) {
        // > 7 days
        priority = 'critical';
      } else if (hoursOverdue > 72) {
        // > 3 days
        priority = 'high';
      } else if (hoursOverdue > 24) {
        // > 1 day
        priority = 'medium';
      } else {
        priority = 'low';
      }

      return {
        ...reminder,
        hoursOverdue,
        priority,
      };
    },
  );

  // Sort: critical first, then by hours overdue (most overdue first)
  categorizedReminders.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.hoursOverdue - b.hoursOverdue; // Most overdue first within same priority
  });

  const criticalCount = categorizedReminders.filter(
    r => r.priority === 'critical',
  ).length;
  const highCount = categorizedReminders.filter(
    r => r.priority === 'high',
  ).length;
  const mediumCount = categorizedReminders.filter(
    r => r.priority === 'medium',
  ).length;
  const lowCount = categorizedReminders.filter(
    r => r.priority === 'low',
  ).length;

  await logger.info(
    'Reminders categorized by overdue status',
    {
      total: categorizedReminders.length,
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
    },
    traceContext,
  );

  // Step 5: Filter out reminders in quiet hours
  const remindersToProcess: CategorizedReminder[] = [];
  const remindersInQuietHours: string[] = [];

  for (const reminder of categorizedReminders) {
    // Check if reminder is in user's quiet hours
    // Skip quiet hours check for critical overdue reminders (they're too important)
    if (reminder.priority === 'critical') {
      remindersToProcess.push(reminder);
      continue;
    }

    const { data: inQuietHours } = await supabaseAdmin.rpc(
      'is_in_quiet_hours',
      {
        p_user_id: reminder.user_id,
        p_check_time: now,
      },
    );

    if (inQuietHours) {
      await logger.info(
        'Reminder in quiet hours, skipping',
        {
          reminder_id: reminder.id,
          user_id: reminder.user_id,
          priority: reminder.priority,
          hours_overdue: reminder.hoursOverdue.toFixed(1),
        },
        traceContext,
      );
      remindersInQuietHours.push(reminder.id);
    } else {
      remindersToProcess.push(reminder);
    }
  }

  await logger.info(
    'Reminders filtered for processing',
    {
      to_process: remindersToProcess.length,
      in_quiet_hours: remindersInQuietHours.length,
    },
    traceContext,
  );

  // Step 6: Process each reminder and send notifications (sorted by priority).
  const remindersToMarkComplete: string[] = [];
  let totalSuccessCount = 0;
  let totalFailureCount = 0;

  for (const reminder of remindersToProcess) {
    try {
      const pushTokens =
        reminder.user?.user_devices?.map(d => d.push_token).filter(Boolean) ||
        [];

      if (pushTokens.length > 0) {
        // Use fallback values if title/body are not set
        const title = reminder.title || 'Reminder';
        const body = reminder.body || 'You have a new reminder from ELARO.';

        // Generate deep link URL for the reminder
        const deepLinkUrl = generateDeepLinkUrl(reminder);
        const itemId =
          reminder.session_id || reminder.assignment_id || reminder.lecture_id;
        const taskType =
          reminder.reminder_type === 'spaced_repetition'
            ? 'study_session'
            : reminder.reminder_type;

        // Generate deduplication key to prevent duplicate notifications
        const dedupKey = generateDeduplicationKey(
          reminder.user_id,
          reminder.reminder_type,
          itemId || reminder.id,
          1440, // Daily bucket
        );

        // Check if notification was already sent (deduplication)
        const { data: existingNotification } = await supabaseAdmin
          .from('notification_queue')
          .select('id')
          .eq('deduplication_key', dedupKey)
          .in('status', ['pending', 'processing', 'sent'])
          .single();

        if (existingNotification) {
          await logger.info(
            'Notification already sent (deduplication)',
            {
              reminder_id: reminder.id,
              dedup_key: dedupKey,
            },
            traceContext,
          );
          // Mark reminder as processed since notification was already sent
          remindersToMarkComplete.push(reminder.id);
          continue;
        }

        // Also check notification_deliveries for recent sends (within last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: recentDelivery } = await supabaseAdmin
          .from('notification_deliveries')
          .select('id')
          .eq('user_id', reminder.user_id)
          .eq('notification_type', reminder.reminder_type)
          .eq('metadata->>itemId', itemId || reminder.id)
          .gte('sent_at', oneHourAgo)
          .limit(1)
          .single();

        if (recentDelivery) {
          await logger.info(
            'Notification sent recently (deduplication)',
            {
              reminder_id: reminder.id,
              delivery_id: recentDelivery.id,
            },
            traceContext,
          );
          remindersToMarkComplete.push(reminder.id);
          continue;
        }

        // Determine category and priority based on reminder type
        const categoryMap: Record<string, string> = {
          assignment: 'assignment',
          lecture: 'lecture',
          spaced_repetition: 'srs_review',
          study_session: 'srs_review',
        };

        const category = categoryMap[reminder.reminder_type] || undefined;

        // Get preferences for unified sender (includes quiet hours check internally)
        // Note: Quiet hours already filtered in batch query, but unified sender will re-validate
        const userPrefs = await getUserNotificationPreferences(
          supabaseAdmin,
          reminder.user_id,
        );

        // Generate email content for reminder
        const emailSubject = `Reminder: ${title}`;
        const emailContent = `
          <h2>📌 ${title}</h2>
          <p>${body}</p>
          <p><strong>Type:</strong> ${reminder.reminder_type}</p>
          ${itemId ? `<p><a href="https://elaro.app${deepLinkUrl.replace('elaro://', '/')}">View Details</a></p>` : ''}
          <p>---</p>
          <p><em>You received this reminder because you have ${reminder.reminder_type} notifications enabled.</em></p>
        `;

        // Use unified notification sender (supports both push and email)
        // Pass preferences to avoid refetch
        const result = await sendUnifiedNotification(supabaseAdmin, {
          userId: reminder.user_id,
          notificationType: reminder.reminder_type,
          title,
          body,
          emailSubject,
          emailContent,
          data: {
            reminderId: reminder.id,
            url: deepLinkUrl,
            itemId: itemId,
            taskType: taskType,
          },
          options: {
            priority: 'high',
            categoryId: category,
          },
          preferences: userPrefs, // Pass to avoid refetch in unified sender
        });

        // Record delivery with both push and email tracking
        await supabaseAdmin.from('notification_deliveries').insert({
          user_id: reminder.user_id,
          notification_type: reminder.reminder_type,
          title: title,
          body: body,
          sent_at: new Date().toISOString(),
          device_token: pushTokens[0] || null,
          deep_link_url: deepLinkUrl,
          metadata: {
            reminderId: reminder.id,
            itemId: itemId,
            taskType: taskType,
            deduplication_key: dedupKey,
            push_sent: result.pushSent,
            email_sent: result.emailSent,
          },
          expo_status:
            result.pushSent && result.pushResult?.success
              ? 'ok'
              : result.emailSent
                ? 'ok'
                : 'error',
          error_message:
            (result.pushSent && result.pushResult?.success) || result.emailSent
              ? null
              : 'Send failed',
        });

        // Mark as complete if either channel succeeded
        if (result.pushSent || result.emailSent) {
          remindersToMarkComplete.push(reminder.id);
        }
        // Update counts
        if (result.pushResult) {
          totalSuccessCount += result.pushResult.sentCount;
          totalFailureCount += result.pushResult.failureCount;
        }
      } else {
        // If there are no push tokens, we can consider the reminder "processed"
        // to prevent it from being picked up again.
        remindersToMarkComplete.push(reminder.id);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await logger.error(
        'Error processing reminder',
        {
          reminder_id: reminder.id,
          error: errorMessage,
        },
        traceContext,
      );

      // Add to dead-letter queue
      try {
        await supabaseAdmin.from('failed_reminders').insert({
          reminder_id: reminder.id,
          user_id: reminder.user_id,
          error_message: errorMessage,
          error_details: {
            stack: error instanceof Error ? error.stack : undefined,
            reminder_type: reminder.reminder_type,
            priority: reminder.priority,
          },
          retry_count: 0,
          next_retry_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Retry in 1 hour
          resolved: false,
        });
      } catch (deadLetterError) {
        // Log but don't fail the whole job
        await logger.error(
          'Failed to log to dead-letter queue',
          {
            error:
              deadLetterError instanceof Error
                ? deadLetterError.message
                : String(deadLetterError),
          },
          traceContext,
        );
      }

      jobMetrics.errors.push(errorMessage);
      totalFailureCount++;
    }
  }

  await logger.info(
    'Notification sending complete',
    {
      successes: totalSuccessCount,
      failures: totalFailureCount,
    },
    traceContext,
  );

  // Step 4: Mark the processed reminders as complete and clear locks
  if (remindersToMarkComplete.length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('reminders')
      .update({
        completed: true,
        processed_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        processing_started_at: null, // Clear lock
        processing_lock_id: null, // Clear lock ID
      })
      .in('id', remindersToMarkComplete)
      .eq('processing_lock_id', lockId); // Only update reminders we locked

    if (updateError) {
      // This is a critical error. If this fails, we might send duplicate notifications.
      await logger.error(
        'CRITICAL: Failed to mark reminders as complete',
        {
          error: updateError.message,
          reminder_count: remindersToMarkComplete.length,
          lock_id: lockId,
        },
        traceContext,
      );
      throw handleDbError(updateError);
    }
    await logger.info(
      'Successfully marked reminders as complete',
      {
        count: remindersToMarkComplete.length,
        lock_id: lockId,
      },
      traceContext,
    );
  }

  // Step 5: Clear locks for reminders that failed to process (but don't mark complete)
  // This prevents them from being stuck locked forever
  const failedReminderIds = dueReminders
    .map((r: DueReminder) => r.id)
    .filter((id: string) => !remindersToMarkComplete.includes(id));

  if (failedReminderIds.length > 0) {
    const { error: unlockError } = await supabaseAdmin
      .from('reminders')
      .update({
        processing_started_at: null,
        processing_lock_id: null,
      })
      .in('id', failedReminderIds)
      .eq('processing_lock_id', lockId); // Only unlock reminders we locked

    if (unlockError) {
      await logger.warn(
        'Failed to unlock failed reminders',
        {
          error: unlockError.message,
          count: failedReminderIds.length,
        },
        traceContext,
      );
    } else {
      await logger.info(
        'Cleared locks for failed reminders',
        {
          count: failedReminderIds.length,
        },
        traceContext,
      );
    }
  }

  // Calculate statistics by priority
  const processedByPriority = {
    critical: remindersToProcess.filter(
      r => r.priority === 'critical' && remindersToMarkComplete.includes(r.id),
    ).length,
    high: remindersToProcess.filter(
      r => r.priority === 'high' && remindersToMarkComplete.includes(r.id),
    ).length,
    medium: remindersToProcess.filter(
      r => r.priority === 'medium' && remindersToMarkComplete.includes(r.id),
    ).length,
    low: remindersToProcess.filter(
      r => r.priority === 'low' && remindersToMarkComplete.includes(r.id),
    ).length,
  };

  // Update metrics
  jobMetrics.reminders_found = categorizedReminders.length;
  jobMetrics.reminders_processed = remindersToMarkComplete.length;
  jobMetrics.notifications_sent = totalSuccessCount;
  jobMetrics.notifications_failed = totalFailureCount;
  jobMetrics.execution_time_ms = Date.now() - startTime;
  jobMetrics.metadata = {
    processedByPriority,
    remindersInQuietHours: remindersInQuietHours.length,
  };

  // Determine status
  if (
    jobMetrics.notifications_failed > 0 &&
    jobMetrics.notifications_sent === 0
  ) {
    jobMetrics.status = 'failure';
  } else if (jobMetrics.notifications_failed > 0) {
    jobMetrics.status = 'partial';
  }

  // Log metrics to database
  try {
    await supabaseAdmin.from('job_metrics').insert({
      job_name: jobMetrics.job_name,
      run_at: new Date().toISOString(),
      status: jobMetrics.status,
      reminders_found: jobMetrics.reminders_found,
      reminders_processed: jobMetrics.reminders_processed,
      notifications_sent: jobMetrics.notifications_sent,
      notifications_failed: jobMetrics.notifications_failed,
      errors: jobMetrics.errors.length > 0 ? jobMetrics.errors : null,
      execution_time_ms: jobMetrics.execution_time_ms,
      metadata: jobMetrics.metadata,
    });
  } catch (metricsError) {
    // Non-critical - log but don't fail
    await logger.warn(
      'Failed to log job metrics',
      {
        error:
          metricsError instanceof Error
            ? metricsError.message
            : String(metricsError),
      },
      traceContext,
    );
  }

  const result = {
    success: true,
    remindersFound: categorizedReminders.length,
    remindersProcessed: remindersToMarkComplete.length,
    notificationsSent: totalSuccessCount,
    notificationsFailed: totalFailureCount,
    processedByPriority,
    remindersInQuietHours: remindersInQuietHours.length,
    executionTimeMs: jobMetrics.execution_time_ms,
    status: jobMetrics.status,
  };

  await logger.info(
    'Finished due reminders processing job',
    result,
    traceContext,
  );
  return result;
}

// Wrap the business logic with our secure, scheduled handler.
// This job does not require a cron secret because it's not destructive and is idempotent.
// If it runs multiple times, it will only process reminders that are not yet complete.
serve(createScheduledHandler(handleProcessDueReminders));
