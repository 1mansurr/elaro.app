/// <reference path="../global.d.ts" />
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { AppError } from '../_shared/function-handler.ts';
import {
  ERROR_CODES,
  ERROR_STATUS_CODES,
  ERROR_MESSAGES,
} from '../_shared/error-codes.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';

const RATE_LIMIT_DAYS = 7;

/**
 * Convert export data to CSV format
 */
function convertToCSV(data: Record<string, unknown>): string {
  const flatten = (obj: unknown, prefix = ''): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    if (
      obj &&
      typeof obj === 'object' &&
      !Array.isArray(obj) &&
      !(obj instanceof Date)
    ) {
      const objTyped = obj as Record<string, unknown>;
      for (const key in objTyped) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (
          objTyped[key] &&
          typeof objTyped[key] === 'object' &&
          !Array.isArray(objTyped[key]) &&
          !(objTyped[key] instanceof Date)
        ) {
          Object.assign(result, flatten(objTyped[key], newKey));
        } else {
          result[newKey] = objTyped[key];
        }
      }
    }
    return result;
  };

  const allRows: Record<string, unknown>[] = [];
  const dataTyped = data.data as Record<string, unknown> | undefined;

  // Flatten user data
  if (dataTyped && typeof dataTyped === 'object' && 'user' in dataTyped) {
    allRows.push({ type: 'user', ...flatten(dataTyped.user) });
  }

  // Flatten arrays
  const processArray = (arr: unknown[], type: string) => {
    if (Array.isArray(arr)) {
      arr.forEach((item, index) => {
        allRows.push({ type: `${type}[${index}]`, ...flatten(item) });
      });
    }
  };

  if (dataTyped) {
    if (Array.isArray(dataTyped.courses)) {
      processArray(dataTyped.courses, 'course');
    }
    if (Array.isArray(dataTyped.assignments)) {
      processArray(dataTyped.assignments, 'assignment');
    }
    if (Array.isArray(dataTyped.lectures)) {
      processArray(dataTyped.lectures, 'lecture');
    }
    if (Array.isArray(dataTyped.studySessions)) {
      processArray(dataTyped.studySessions, 'studySession');
    }
    if (Array.isArray(dataTyped.reminders)) {
      processArray(dataTyped.reminders, 'reminder');
    }
    if (Array.isArray(dataTyped.userDevices)) {
      processArray(dataTyped.userDevices, 'userDevice');
    }

    if (dataTyped.notificationPreferences) {
      allRows.push({
        type: 'notificationPreferences',
        ...flatten(dataTyped.notificationPreferences),
      });
    }

    if (dataTyped.streaks) {
      allRows.push({ type: 'streaks', ...flatten(dataTyped.streaks) });
    }

    if (dataTyped.userEvents && Array.isArray(dataTyped.userEvents)) {
      processArray(dataTyped.userEvents, 'userEvent');
    }

    if (
      dataTyped.notificationDeliveries &&
      Array.isArray(dataTyped.notificationDeliveries)
    ) {
      processArray(dataTyped.notificationDeliveries, 'notificationDelivery');
    }

    if (dataTyped.adminActions && Array.isArray(dataTyped.adminActions)) {
      processArray(dataTyped.adminActions, 'adminAction');
    }
  }

  if (allRows.length === 0) {
    return 'No data to export';
  }

  // Get all unique keys
  const allKeys = new Set<string>();
  allRows.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key));
  });

  const keys = Array.from(allKeys).sort();

  // Create CSV header
  const header = keys.join(',');

  // Create CSV rows
  const rows = allRows.map(row => {
    return keys
      .map(key => {
        const value = row[key];
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        const stringValue = String(value);
        if (
          stringValue.includes(',') ||
          stringValue.includes('"') ||
          stringValue.includes('\n')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',');
  });

  return [header, ...rows].join('\n');
}

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const userResponse = await supabaseAdmin.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', ''),
    );
    const user = userResponse.data.user;

    if (!user) {
      throw new AppError(
        ERROR_MESSAGES.UNAUTHORIZED,
        ERROR_STATUS_CODES.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
      );
    }

    // --- Get Export Format ---
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'json';
    const supportedFormats = ['json', 'csv'];
    if (!supportedFormats.includes(format)) {
      throw new AppError(
        `Unsupported format. Supported formats: ${supportedFormats.join(', ')}`,
        400,
        ERROR_CODES.INVALID_INPUT,
      );
    }

    // --- Check User Role and Rate Limiting ---
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role, last_data_export_at')
      .eq('id', user.id)
      .single();

    if (userError) {
      throw handleDbError(userError);
    }

    const isAdmin = userData?.role === 'admin';

    // --- Rate Limiting Check ---
    if (userData?.last_data_export_at) {
      const lastExportDate = new Date(userData.last_data_export_at);
      const nextAvailableDate = new Date(
        lastExportDate.getTime() + RATE_LIMIT_DAYS * 24 * 60 * 60 * 1000,
      );

      if (new Date() < nextAvailableDate) {
        throw new AppError(
          `Data export is limited to once every ${RATE_LIMIT_DAYS} days. Next available on: ${nextAvailableDate.toDateString()}`,
          ERROR_STATUS_CODES.RATE_LIMIT_EXCEEDED,
          ERROR_CODES.RATE_LIMIT_EXCEEDED,
        );
      }
    }

    // --- Data Collection ---
    const traceContext = extractTraceContext(req);
    await logger.info(
      'Starting data export',
      { user_id: user.id, format, is_admin: isAdmin },
      traceContext,
    );

    // Base data queries (all users)
    const [
      userProfile,
      notificationPreferences,
      courses,
      assignments,
      lectures,
      studySessions,
      reminders,
      userDevices,
      streaks,
      userEvents,
      notificationDeliveries,
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*').eq('id', user.id).single(),
      supabaseAdmin
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single(),
      supabaseAdmin.from('courses').select('*').eq('user_id', user.id),
      supabaseAdmin.from('assignments').select('*').eq('user_id', user.id),
      supabaseAdmin.from('lectures').select('*').eq('user_id', user.id),
      supabaseAdmin.from('study_sessions').select('*').eq('user_id', user.id),
      supabaseAdmin.from('reminders').select('*').eq('user_id', user.id),
      supabaseAdmin
        .from('user_devices')
        .select('platform, updated_at')
        .eq('user_id', user.id), // Exclude push_token
      supabaseAdmin.from('streaks').select('*').eq('user_id', user.id).single(),
      supabaseAdmin.from('user_events').select('*').eq('user_id', user.id),
      supabaseAdmin
        .from('notification_deliveries')
        .select(
          'id, notification_type, title, body, sent_at, delivered_at, opened_at, clicked_at, deep_link_url, created_at',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1000), // Limit to last 1000 notifications
    ]);

    // Admin-only data (only actions performed by this admin)
    let adminActions: Record<string, unknown>[] | null = null;
    if (isAdmin) {
      const { data: adminActionsData } = await supabaseAdmin
        .from('admin_actions')
        .select('*')
        .eq('admin_id', user.id) // Only actions performed by this admin
        .order('created_at', { ascending: false });
      adminActions = adminActionsData;
    }

    // --- Data Compilation ---
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email,
      format: format,
      data: {
        user: userProfile.data,
        notificationPreferences: notificationPreferences.data,
        courses: courses.data,
        assignments: assignments.data,
        lectures: lectures.data,
        studySessions: studySessions.data,
        reminders: reminders.data,
        userDevices: userDevices.data,
        streaks: streaks.data,
        userEvents: userEvents.data,
        notificationDeliveries: notificationDeliveries.data,
        ...(isAdmin && adminActions ? { adminActions } : {}),
      },
      metadata: {
        totalCourses: courses.data?.length || 0,
        totalAssignments: assignments.data?.length || 0,
        totalLectures: lectures.data?.length || 0,
        totalStudySessions: studySessions.data?.length || 0,
        totalReminders: reminders.data?.length || 0,
        totalUserEvents: userEvents.data?.length || 0,
        totalNotificationDeliveries: notificationDeliveries.data?.length || 0,
        ...(isAdmin && adminActions
          ? { totalAdminActions: adminActions.length }
          : {}),
      },
    };

    // --- Format Response ---
    let responseBody: string;
    let contentType: string;

    if (format === 'csv') {
      responseBody = convertToCSV(exportData);
      contentType = 'text/csv';
    } else {
      responseBody = JSON.stringify(exportData, null, 2);
      contentType = 'application/json';
    }

    // --- Update Rate Limit Timestamp ---
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ last_data_export_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      // Log the error but still return the data to the user
      await logger.error(
        'Failed to update last_data_export_at',
        {
          error: updateError.message,
          user_id: user.id,
        },
        traceContext,
      );
    }

    await logger.info(
      'Data export successful',
      { user_id: user.id, format, data_size: responseBody.length },
      traceContext,
    );

    const filename = `elaro-export-${user.id}-${new Date().toISOString().split('T')[0]}.${format}`;

    return new Response(responseBody, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      status: 200,
    });
  } catch (error) {
    const traceContext = extractTraceContext(req);
    await logger.error(
      'Error during data export',
      {
        error: error instanceof Error ? error.message : String(error),
        user_id:
          error instanceof AppError
            ? undefined
            : req.headers.get('Authorization')
              ? 'unknown'
              : undefined,
      },
      traceContext,
    );

    const status = error instanceof AppError ? error.statusCode : 500;
    const message =
      error instanceof AppError ? error.message : ERROR_MESSAGES.INTERNAL_ERROR;
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });
  }
});
