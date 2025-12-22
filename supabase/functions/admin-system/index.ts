import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/response.ts';
import {
  AuthenticatedRequest,
  AppError,
  ERROR_CODES,
} from '../_shared/function-handler.ts';
import { createAdminHandler } from '../_shared/admin-handler.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { z } from 'zod';

// Admin operation schemas
const AdminExportSchema = z.object({
  user_id: z.string().uuid().optional(),
  format: z.enum(['json', 'csv']).optional(),
});

const AdminCleanupSchema = z.object({
  type: z.enum([
    'rate_limits',
    'idempotency_keys',
    'old_reminders',
    'deleted_items',
  ]),
  older_than_days: z.number().int().min(1).max(365).optional(),
});

const SuspendUserSchema = z.object({
  user_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

const UnsuspendUserSchema = z.object({
  user_id: z.string().uuid(),
});

const DeleteUserSchema = z.object({
  user_id: z.string().uuid(),
  permanent: z.boolean().optional(),
});

const RestoreUserSchema = z.object({
  user_id: z.string().uuid(),
});

const GrantPremiumSchema = z.object({
  user_id: z.string().uuid(),
  subscription_tier: z.enum(['oddity', 'admin']).optional(),
});

// StartTrialSchema removed - no longer supporting free trials

const GetMetricsSchema = z.object({
  period: z.enum(['7d', '30d', '90d']).optional(),
});

// Helper to get service role client for admin database operations
function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

// Consolidated Admin System - Handles all admin operations
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
        new AppError('Invalid admin action', 404, ERROR_CODES.DB_NOT_FOUND),
      );
    }

    // Handler is already wrapped with createAdminHandler, just call it
    return await handler(req);
  } catch (error) {
    const traceContext = extractTraceContext(req);
    await logger.error(
      'Admin system error',
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

// Route handlers - All handlers are wrapped with createAdminHandler
type HandlerFunction = (req: Request) => Promise<Response>;

function getHandler(action: string | null) {
  const handlers: Record<string, HandlerFunction> = {
    export: createAdminHandler(
      handleExportData,
      'admin-export',
      AdminExportSchema,
      false,
    ),
    cleanup: createAdminHandler(
      handleCleanupData,
      'admin-cleanup',
      AdminCleanupSchema,
      true,
    ),
    health: createAdminHandler(
      handleHealthCheck,
      'admin-health',
      undefined,
      false,
    ),
    suspend: createAdminHandler(
      handleSuspendUser,
      'admin-suspend',
      SuspendUserSchema,
      true,
    ),
    unsuspend: createAdminHandler(
      handleUnsuspendUser,
      'admin-unsuspend',
      UnsuspendUserSchema,
      true,
    ),
    delete: createAdminHandler(
      handleDeleteUser,
      'admin-delete',
      DeleteUserSchema,
      true,
    ),
    restore: createAdminHandler(
      handleRestoreUser,
      'admin-restore',
      RestoreUserSchema,
      true,
    ),
    'grant-premium': createAdminHandler(
      handleGrantPremium,
      'admin-grant-premium',
      GrantPremiumSchema,
      true,
    ),
    // 'start-trial' handler removed - no longer supporting free trials
    metrics: createAdminHandler(
      handleGetMetrics,
      'admin-metrics',
      GetMetricsSchema,
      false,
    ),
    'auto-unsuspend': createAdminHandler(
      handleAutoUnsuspend,
      'admin-auto-unsuspend',
      undefined,
      false,
    ),
  };

  return action ? handlers[action] : undefined;
}

// Handler functions - All use AuthenticatedRequest but use admin client for DB operations
async function handleExportData({ body }: AuthenticatedRequest) {
  const { user_id } = body || {};
  const supabaseAdmin = getAdminClient();

  if (user_id) {
    // Export specific user's data
    const [
      coursesRes,
      assignmentsRes,
      lecturesRes,
      studySessionsRes,
      remindersRes,
    ] = await Promise.all([
      supabaseAdmin.from('courses').select('*').eq('user_id', user_id),
      supabaseAdmin.from('assignments').select('*').eq('user_id', user_id),
      supabaseAdmin.from('lectures').select('*').eq('user_id', user_id),
      supabaseAdmin.from('study_sessions').select('*').eq('user_id', user_id),
      supabaseAdmin.from('reminders').select('*').eq('user_id', user_id),
    ]);

    // Check for errors
    if (coursesRes.error) handleDbError(coursesRes.error);
    if (assignmentsRes.error) handleDbError(assignmentsRes.error);
    if (lecturesRes.error) handleDbError(lecturesRes.error);
    if (studySessionsRes.error) handleDbError(studySessionsRes.error);
    if (remindersRes.error) handleDbError(remindersRes.error);

    return {
      user_id,
      courses: coursesRes.data,
      assignments: assignmentsRes.data,
      lectures: lecturesRes.data,
      studySessions: studySessionsRes.data,
      reminders: remindersRes.data,
    };
  } else {
    // Export all data (admin only)
    const [
      usersRes,
      coursesRes,
      assignmentsRes,
      lecturesRes,
      studySessionsRes,
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*'),
      supabaseAdmin.from('courses').select('*'),
      supabaseAdmin.from('assignments').select('*'),
      supabaseAdmin.from('lectures').select('*'),
      supabaseAdmin.from('study_sessions').select('*'),
    ]);

    // Check for errors
    if (usersRes.error) handleDbError(usersRes.error);
    if (coursesRes.error) handleDbError(coursesRes.error);
    if (assignmentsRes.error) handleDbError(assignmentsRes.error);
    if (lecturesRes.error) handleDbError(lecturesRes.error);
    if (studySessionsRes.error) handleDbError(studySessionsRes.error);

    return {
      users: usersRes.data,
      courses: coursesRes.data,
      assignments: assignmentsRes.data,
      lectures: lecturesRes.data,
      studySessions: studySessionsRes.data,
    };
  }
}

async function handleCleanupData({ body }: AuthenticatedRequest) {
  const { type, older_than_days = 30 } = body;
  const supabaseAdmin = getAdminClient();

  const cutoffDate = new Date(
    Date.now() - older_than_days * 24 * 60 * 60 * 1000,
  ).toISOString();
  const results: Record<string, unknown> = {};

  switch (type) {
    case 'rate_limits': {
      const { data, error } = await supabaseAdmin
        .from('rate_limits')
        .delete()
        .lt('created_at', cutoffDate);
      if (error) handleDbError(error);
      results.rateLimits = data;
      break;
    }

    case 'idempotency_keys': {
      const { data, error } = await supabaseAdmin
        .from('idempotency_keys')
        .delete()
        .lt('created_at', cutoffDate);
      if (error) handleDbError(error);
      results.idempotencyKeys = data;
      break;
    }

    case 'old_reminders': {
      const { data, error } = await supabaseAdmin
        .from('reminders')
        .delete()
        .eq('completed', true)
        .lt('processed_at', cutoffDate);
      if (error) handleDbError(error);
      results.oldReminders = data;
      break;
    }

    case 'deleted_items': {
      // Permanently delete items that have been soft-deleted for more than specified days
      const tables = ['courses', 'assignments', 'lectures', 'study_sessions'];
      for (const table of tables) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .delete()
          .not('deleted_at', 'is', null)
          .lt('deleted_at', cutoffDate);
        if (error) handleDbError(error);
        results[table] = data;
      }
      break;
    }

    default:
      throw new AppError(
        'Invalid cleanup type',
        400,
        ERROR_CODES.INVALID_INPUT,
      );
  }

  return results;
}

async function handleHealthCheck({ supabaseClient }: AuthenticatedRequest) {
  // Check database connectivity using authenticated client
  const { error } = await supabaseClient
    .from('users')
    .select('count')
    .limit(1);

  if (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };
}

async function handleSuspendUser({ body }: AuthenticatedRequest) {
  const { user_id, reason } = body;
  const supabaseAdmin = getAdminClient();

  const { data: suspendedUser, error } = await supabaseAdmin
    .from('users')
    .update({
      account_status: 'suspended',
      suspension_reason: reason,
      suspended_at: new Date().toISOString(),
    })
    .eq('id', user_id)
    .select()
    .single();

  if (error) handleDbError(error);
  return suspendedUser;
}

async function handleUnsuspendUser({ body }: AuthenticatedRequest) {
  const { user_id } = body;
  const supabaseAdmin = getAdminClient();

  const { data: unsuspendedUser, error } = await supabaseAdmin
    .from('users')
    .update({
      account_status: 'active',
      suspension_reason: null,
      suspended_at: null,
    })
    .eq('id', user_id)
    .select()
    .single();

  if (error) handleDbError(error);
  return unsuspendedUser;
}

async function handleDeleteUser({ body }: AuthenticatedRequest) {
  const { user_id, permanent = false } = body;
  const supabaseAdmin = getAdminClient();

  if (permanent) {
    // Permanently delete user and all associated data
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user_id);

    if (error) handleDbError(error);
    return { deleted: true };
  } else {
    // Soft delete user
    const { data: deletedUser, error } = await supabaseAdmin
      .from('users')
      .update({
        account_status: 'deleted',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', user_id)
      .select()
      .single();

    if (error) handleDbError(error);
    return deletedUser;
  }
}

async function handleRestoreUser({ body }: AuthenticatedRequest) {
  const { user_id } = body;
  const supabaseAdmin = getAdminClient();

  const { data: restoredUser, error } = await supabaseAdmin
    .from('users')
    .update({
      account_status: 'active',
      deleted_at: null,
    })
    .eq('id', user_id)
    .select()
    .single();

  if (error) handleDbError(error);
  return restoredUser;
}

async function handleGrantPremium({ body }: AuthenticatedRequest) {
  const { user_id, subscription_tier = 'oddity' } = body;
  const supabaseAdmin = getAdminClient();

  const { data: premiumUser, error } = await supabaseAdmin
    .from('users')
    .update({ subscription_tier })
    .eq('id', user_id)
    .select()
    .single();

  if (error) handleDbError(error);
  return premiumUser;
}

// handleStartTrial function removed - no longer supporting free trials

async function handleGetMetrics({ body }: AuthenticatedRequest) {
  const { period = '30d' } = body || {};
  const supabaseAdmin = getAdminClient();

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const startDate = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [usersRes, coursesRes, assignmentsRes, lecturesRes, studySessionsRes] =
    await Promise.all([
      supabaseAdmin
        .from('users')
        .select('count', { count: 'exact', head: true })
        .gte('created_at', startDate),
      supabaseAdmin
        .from('courses')
        .select('count', { count: 'exact', head: true })
        .gte('created_at', startDate),
      supabaseAdmin
        .from('assignments')
        .select('count', { count: 'exact', head: true })
        .gte('created_at', startDate),
      supabaseAdmin
        .from('lectures')
        .select('count', { count: 'exact', head: true })
        .gte('created_at', startDate),
      supabaseAdmin
        .from('study_sessions')
        .select('count', { count: 'exact', head: true })
        .gte('created_at', startDate),
    ]);

  // Check for errors
  if (usersRes.error) handleDbError(usersRes.error);
  if (coursesRes.error) handleDbError(coursesRes.error);
  if (assignmentsRes.error) handleDbError(assignmentsRes.error);
  if (lecturesRes.error) handleDbError(lecturesRes.error);
  if (studySessionsRes.error) handleDbError(studySessionsRes.error);

  return {
    period,
    users: usersRes.count || 0,
    courses: coursesRes.count || 0,
    assignments: assignmentsRes.count || 0,
    lectures: lecturesRes.count || 0,
    studySessions: studySessionsRes.count || 0,
  };
}

async function handleAutoUnsuspend({}: AuthenticatedRequest) {
  // Find users who should be auto-unsuspended
  const supabaseAdmin = getAdminClient();
  const { data: suspendedUsers, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('account_status', 'suspended')
    .not('suspended_at', 'is', null)
    .lt(
      'suspended_at',
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    );

  if (error) handleDbError(error);

  const results = [];
  for (const user of suspendedUsers || []) {
    try {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          account_status: 'active',
          suspension_reason: null,
          suspended_at: null,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      results.push({ success: true, user_id: user.id });
    } catch (error) {
      results.push({
        success: false,
        user_id: user.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
