/**
 * Consolidated SRS (Spaced Repetition System) Edge Function
 *
 * This function consolidates all SRS-related operations that were previously
 * spread across multiple separate Edge Functions.
 *
 * Routes:
 * - POST /srs-system/record-performance - Record SRS performance
 * - GET /srs-system/performance/:session_id - Get SRS performance for session
 * - GET /srs-system/next-review - Get next items for review
 * - POST /srs-system/schedule-review - Schedule next review
 * - GET /srs-system/statistics - Get SRS statistics
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  AuthenticatedRequest,
  AppError,
  ERROR_CODES,
} from '../_shared/function-handler.ts';
import {
  wrapOldHandler,
  extractIdFromUrl,
  handleDbError,
} from '../api-v2/_handler-utils.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createResponse, errorResponse } from '../_shared/response.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const RecordSRSPerformanceSchema = z.object({
  session_id: z.string().uuid(),
  reminder_id: z.string().uuid().optional(),
  quality_rating: z.number().int().min(0).max(5),
  response_time_seconds: z.number().int().positive().optional(),
  schedule_next: z.boolean().default(true),
});

const ScheduleReviewSchema = z.object({
  session_id: z.string().uuid(),
  next_review_date: z.string().datetime(),
  interval_days: z.number().int().positive(),
});

// SRS service class
class SRSService {
  constructor(
    private supabaseClient: any,
    private user: any,
  ) {}

  async recordPerformance(data: any) {
    const {
      session_id,
      reminder_id,
      quality_rating,
      response_time_seconds,
      schedule_next,
    } = RecordSRSPerformanceSchema.parse(data);

    // 1. Verify the study session belongs to the user
    const { data: session, error: sessionError } = await this.supabaseClient
      .from('study_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', this.user.id)
      .single();

    if (sessionError || !session) {
      throw new AppError(
        'Study session not found or access denied',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    // 2. Get the last performance record (not single record - multiple records exist)
    const { data: lastPerformance } = await this.supabaseClient
      .from('srs_performance')
      .select('*')
      .eq('session_id', session_id)
      .eq('user_id', this.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Calculate parameters from last performance or defaults
    let currentInterval = lastPerformance?.next_interval_days || 1;
    let currentEaseFactor = lastPerformance?.ease_factor || 2.5;
    let repetitionNumber = (lastPerformance?.repetition_number || 0) + 1;

    // Check for cramming
    const { data: crammingData } = await this.supabaseClient.rpc(
      'detect_cramming',
      {
        p_user_id: this.user.id,
        p_session_id: session_id,
        p_hours_window: 24,
      },
    );

    const isCramming = crammingData?.[0]?.is_cramming || false;
    let adjustedEaseFactor = currentEaseFactor;
    if (isCramming) {
      adjustedEaseFactor = Math.max(1.3, currentEaseFactor - 0.1);
    }

    // Calculate next interval using SM-2 algorithm
    const { data: calculation, error: calcError } =
      await this.supabaseClient.rpc('calculate_next_srs_interval', {
        p_quality_rating: quality_rating,
        p_current_interval: currentInterval,
        p_ease_factor: adjustedEaseFactor,
        p_repetition_number: repetitionNumber,
      });

    if (calcError) handleDbError(calcError);

    const nextInterval = calculation[0]?.next_interval || 1;
    const newEaseFactor = calculation[0]?.new_ease_factor || 2.5;

    // Insert new performance record (not update - each review is a new record)
    const { data: srsRecord, error: createError } = await this.supabaseClient
      .from('srs_performance')
      .insert({
        user_id: this.user.id,
        session_id: session_id,
        reminder_id: reminder_id || null,
        review_date: new Date().toISOString(),
        quality_rating: quality_rating,
        response_time_seconds: response_time_seconds,
        ease_factor: newEaseFactor,
        interval_days: currentInterval,
        next_interval_days: nextInterval,
        repetition_number: repetitionNumber,
      })
      .select()
      .single();

    if (createError) handleDbError(createError);

    // 3. Update reminder if provided
    if (reminder_id) {
      const { error: reminderError } = await this.supabaseClient
        .from('reminders')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', reminder_id)
        .eq('user_id', this.user.id);

      if (reminderError) {
        // Non-critical error, log but don't fail
      }
    }

    return srsRecord;
  }

  async getPerformance(sessionId: string) {
    const { data: performance, error } = await this.supabaseClient
      .from('srs_performance')
      .select(
        `
        *,
        study_sessions (
          id,
          topic,
          session_date
        )
      `,
      )
      .eq('session_id', sessionId)
      .eq('user_id', this.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError(
          'SRS performance not found',
          404,
          ERROR_CODES.DB_NOT_FOUND,
        );
      }
      handleDbError(error);
    }

    return performance;
  }

  async getNextReview() {
    const now = new Date().toISOString();

    // Get sessions with due reminders from reminders table
    const { data: dueReminders, error } = await this.supabaseClient
      .from('reminders')
      .select(
        `
        *,
        study_sessions (
          id,
          topic,
          session_date,
          notes
        )
      `,
      )
      .eq('user_id', this.user.id)
      .in('reminder_type', ['spaced_repetition', 'srs_review'])
      .eq('completed', false)
      .lte('reminder_time', now)
      .order('reminder_time', { ascending: true })
      .limit(10);

    if (error) handleDbError(error);

    return dueReminders || [];
  }

  async scheduleReview(data: any) {
    const { session_id, next_review_date, interval_days } =
      ScheduleReviewSchema.parse(data);

    // Verify session ownership
    const { data: session, error: sessionError } = await this.supabaseClient
      .from('study_sessions')
      .select('id, topic')
      .eq('id', session_id)
      .eq('user_id', this.user.id)
      .single();

    if (sessionError || !session) {
      throw new AppError(
        'Study session not found or access denied',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    // Schedule reminder in reminders table (not srs_performance)
    const { data: reminder, error: reminderError } = await this.supabaseClient
      .from('reminders')
      .insert({
        user_id: this.user.id,
        session_id: session_id,
        reminder_time: next_review_date,
        reminder_type: 'spaced_repetition',
        title: `Review: ${session.topic}`,
        body: `Time to review "${session.topic}" to strengthen your memory`,
        completed: false,
        priority: 'medium',
      })
      .select()
      .single();

    if (reminderError) handleDbError(reminderError);

    return reminder;
  }

  async getStatistics() {
    const { data: stats, error } = await this.supabaseClient
      .from('srs_performance')
      .select(
        'quality_rating, repetition_number, review_date, next_interval_days, session_id',
      )
      .eq('user_id', this.user.id);

    if (error) handleDbError(error);

    if (!stats || stats.length === 0) {
      return {
        total_sessions: 0,
        total_reviews: 0,
        average_quality: 0,
        due_for_review: 0,
        review_distribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const totalReviews = stats.length;
    const averageQuality =
      stats.reduce((sum, s) => sum + (s.quality_rating || 0), 0) / totalReviews;

    // Count due reminders
    const now = new Date().toISOString();
    const { count: dueCount } = await this.supabaseClient
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.user.id)
      .in('reminder_type', ['spaced_repetition', 'srs_review'])
      .eq('completed', false)
      .lte('reminder_time', now);

    return {
      total_sessions: new Set(stats.map(s => s.session_id)).size,
      total_reviews: totalReviews,
      average_quality: Math.round(averageQuality * 100) / 100,
      due_for_review: dueCount || 0,
      review_distribution: this.getQualityDistribution(stats),
    };
  }

  // Removed: calculateNextReview - use calculate_next_srs_interval RPC instead

  private getQualityDistribution(stats: any[]): Record<number, number> {
    const distribution: Record<number, number> = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    stats.forEach(stat => {
      const rating = stat.quality_rating || 0;
      distribution[rating] = (distribution[rating] || 0) + 1;
    });

    return distribution;
  }
}

// Handler functions - Use AuthenticatedRequest and SRSService
async function handleRecordPerformance(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new SRSService(supabaseClient, user);
  return await service.recordPerformance(body);
}

async function handleGetPerformance(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const sessionId = extractIdFromUrl(req.url);
  if (!sessionId) {
    throw new AppError(
      'Session ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }
  const service = new SRSService(supabaseClient, user);
  return await service.getPerformance(sessionId);
}

async function handleGetNextReview(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new SRSService(supabaseClient, user);
  return await service.getNextReview();
}

async function handleScheduleReview(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new SRSService(supabaseClient, user);
  return await service.scheduleReview(body);
}

async function handleGetStatistics(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new SRSService(supabaseClient, user);
  return await service.getStatistics();
}

// Main handler with routing
serve(async req => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Get action - if last part is a UUID and second-to-last is 'performance', use 'performance' as action
    let action = pathParts[pathParts.length - 1];
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      uuidPattern.test(action) &&
      pathParts.length > 1 &&
      pathParts[pathParts.length - 2] === 'performance'
    ) {
      action = 'performance';
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
      'SRS system error',
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
    'record-performance': wrapOldHandler(
      handleRecordPerformance,
      'srs-record-performance',
      RecordSRSPerformanceSchema,
      true,
    ),
    performance: wrapOldHandler(
      handleGetPerformance,
      'srs-performance',
      undefined,
      false,
    ),
    'next-review': wrapOldHandler(
      handleGetNextReview,
      'srs-next-review',
      undefined,
      false,
    ),
    'schedule-review': wrapOldHandler(
      handleScheduleReview,
      'srs-schedule-review',
      ScheduleReviewSchema,
      true,
    ),
    statistics: wrapOldHandler(
      handleGetStatistics,
      'srs-statistics',
      undefined,
      false,
    ),
  };

  return action ? handlers[action] : undefined;
}
