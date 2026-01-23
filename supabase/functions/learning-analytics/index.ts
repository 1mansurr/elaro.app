/**
 * Consolidated Learning Analytics Edge Function
 *
 * This function consolidates all learning analytics operations that were previously
 * spread across multiple separate Edge Functions.
 *
 * Routes:
 * - GET /learning-analytics/streak - Get user streak information
 * - GET /learning-analytics/performance - Get learning performance metrics
 * - GET /learning-analytics/progress - Get course progress analytics
 * - GET /learning-analytics/study-time - Get study time analytics
 * - GET /learning-analytics/retention - Get knowledge retention metrics
 */

// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { wrapOldHandler } from '../api-v2/_handler-utils.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/response.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import {
  type SupabaseClient,
  type User,
  // @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
} from 'https://esm.sh/@supabase/supabase-js@2.0.0';

// Learning Analytics service class
class LearningAnalyticsService {
  constructor(
    private supabaseClient: SupabaseClient,
    private user: User,
  ) {}

  async getStreakInfo() {
    // Get study sessions for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: sessions, error } = await this.supabaseClient
      .from('study_sessions')
      .select('session_date')
      .eq('user_id', this.user.id)
      .gte('session_date', thirtyDaysAgo.toISOString())
      .is('deleted_at', null)
      .order('session_date', { ascending: true });

    if (error) {
      throw handleDbError(error);
    }

    // Calculate current streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessionDates = sessions.map((s: { session_date: string }) => {
      const date = new Date(s.session_date);
      date.setHours(0, 0, 0, 0);
      return date;
    });

    // Calculate current streak (consecutive days from today backwards)
    const checkDate = new Date(today);
    while (sessionDates.some((d: Date) => d.getTime() === checkDate.getTime())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate longest streak
    for (let i = 0; i < sessionDates.length; i++) {
      if (
        i === 0 ||
        sessionDates[i].getTime() - sessionDates[i - 1].getTime() === 86400000
      ) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      current_streak: currentStreak,
      longest_streak: longestStreak,
      total_sessions_30_days: sessions.length,
      last_study_date:
        sessions.length > 0 ? sessions[sessions.length - 1].session_date : null,
    };
  }

  async getPerformanceMetrics() {
    // Get SRS performance data
    const { data: srsData, error: srsError } = await this.supabaseClient
      .from('srs_performance')
      .select('quality_rating, review_count, last_reviewed_at')
      .eq('user_id', this.user.id);

    if (srsError) {
      throw handleDbError(srsError);
    }

    // Get study session data
    const { data: sessions, error: sessionError } = await this.supabaseClient
      .from('study_sessions')
      .select('session_date, has_spaced_repetition')
      .eq('user_id', this.user.id)
      .is('deleted_at', null);

    if (sessionError) {
      throw handleDbError(sessionError);
    }

    // Calculate metrics
    const totalSessions = sessions.length;
    const srsSessions = sessions.filter((s: { has_spaced_repetition?: boolean }) => s.has_spaced_repetition).length;
    const averageQuality =
      srsData.length > 0
        ? srsData.reduce((sum: number, s: { quality_rating: number }) => sum + s.quality_rating, 0) / srsData.length
        : 0;
    const totalReviews = srsData.reduce((sum: number, s: { review_count: number }) => sum + s.review_count, 0);

    return {
      total_sessions: totalSessions,
      srs_sessions: srsSessions,
      srs_adoption_rate:
        totalSessions > 0 ? (srsSessions / totalSessions) * 100 : 0,
      average_quality_rating: Math.round(averageQuality * 100) / 100,
      total_reviews: totalReviews,
      reviews_per_session: srsSessions > 0 ? totalReviews / srsSessions : 0,
    };
  }

  async getCourseProgress() {
    // Get courses with their assignments and study sessions
    const { data: courses, error: courseError } = await this.supabaseClient
      .from('courses')
      .select(
        `
        id,
        course_name,
        course_code,
        assignments (
          id,
          due_date,
          deleted_at
        ),
        study_sessions (
          id,
          session_date,
          deleted_at
        )
      `,
      )
      .eq('user_id', this.user.id)
      .is('deleted_at', null);

    if (courseError) {
      throw handleDbError(courseError);
    }

    const courseProgress = courses.map((course: { id: string; course_name: string; course_code: string; assignments: Array<{ deleted_at?: string | null; due_date: string }>; study_sessions: Array<{ deleted_at?: string | null; session_date: string }> }) => {
      const activeAssignments = course.assignments.filter((a: { deleted_at?: string | null }) => !a.deleted_at);
      const activeSessions = course.study_sessions.filter((s: { deleted_at?: string | null }) => !s.deleted_at);

      const upcomingAssignments = activeAssignments.filter(
        (a: { due_date: string }) => new Date(a.due_date) > new Date(),
      ).length;

      const recentSessions = activeSessions.filter((s: { session_date: string }) => {
        const sessionDate = new Date(s.session_date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return sessionDate >= sevenDaysAgo;
      }).length;

      return {
        course_id: course.id,
        course_name: course.course_name,
        course_code: course.course_code,
        total_assignments: activeAssignments.length,
        upcoming_assignments: upcomingAssignments,
        total_sessions: activeSessions.length,
        recent_sessions: recentSessions,
        activity_score: this.calculateActivityScore(
          activeSessions,
          activeAssignments,
        ),
      };
    });

    return courseProgress;
  }

  async getStudyTimeAnalytics() {
    // Get study sessions with time data
    const { data: sessions, error } = await this.supabaseClient
      .from('study_sessions')
      .select('session_date, created_at, updated_at')
      .eq('user_id', this.user.id)
      .is('deleted_at', null)
      .order('session_date', { ascending: false });

    if (error) {
      throw handleDbError(error);
    }

    // Calculate time-based analytics
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weeklySessions = sessions.filter(
      (s: { session_date: string }) => new Date(s.session_date) >= lastWeek,
    ).length;
    const monthlySessions = sessions.filter(
      (s: { session_date: string }) => new Date(s.session_date) >= lastMonth,
    ).length;

    // Calculate study patterns
    const studyDays = new Set(
      sessions.map((s: { session_date: string }) => {
        const date = new Date(s.session_date);
        return date.toISOString().split('T')[0];
      }),
    );

    const studyPattern = this.analyzeStudyPattern(sessions);

    return {
      total_sessions: sessions.length,
      weekly_sessions: weeklySessions,
      monthly_sessions: monthlySessions,
      unique_study_days: studyDays.size,
      study_pattern: studyPattern,
      average_sessions_per_day:
        studyDays.size > 0 ? sessions.length / studyDays.size : 0,
    };
  }

  async getRetentionMetrics() {
    // Get SRS performance for retention analysis
    const { data: srsData, error } = await this.supabaseClient
      .from('srs_performance')
      .select('quality_rating, review_count, last_reviewed_at, next_review_at')
      .eq('user_id', this.user.id);

    if (error) {
      throw handleDbError(error);
    }

    // Calculate retention metrics
    const totalItems = srsData.length;
    const masteredItems = srsData.filter((s: { quality_rating: number }) => s.quality_rating >= 4).length;
    const strugglingItems = srsData.filter((s: { quality_rating: number }) => s.quality_rating <= 2).length;

    const now = new Date();
    const dueForReview = srsData.filter(
      (s: { next_review_at: string }) => new Date(s.next_review_at) <= now,
    ).length;

    const averageReviewCount =
      totalItems > 0
        ? srsData.reduce((sum: number, s: { review_count: number }) => sum + s.review_count, 0) / totalItems
        : 0;

    return {
      total_items: totalItems,
      mastered_items: masteredItems,
      struggling_items: strugglingItems,
      mastery_rate: totalItems > 0 ? (masteredItems / totalItems) * 100 : 0,
      due_for_review: dueForReview,
      average_review_count: Math.round(averageReviewCount * 100) / 100,
      retention_score: this.calculateRetentionScore(srsData),
    };
  }

  private calculateActivityScore(
    sessions: Array<{ session_date: string }>,
    assignments: Array<{ due_date: string }>,
  ): number {
    const recentSessions = sessions.filter((s: { session_date: string }) => {
      const sessionDate = new Date(s.session_date);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return sessionDate >= sevenDaysAgo;
    }).length;

    const upcomingAssignments = assignments.filter(
      a => new Date(a.due_date) > new Date(),
    ).length;

    // Simple scoring: recent sessions + upcoming assignments
    return Math.min(recentSessions + upcomingAssignments, 10);
  }

  private analyzeStudyPattern(
    sessions: Array<{ session_date: string }>,
  ): Record<string, unknown> {
    const dayOfWeekCount: Record<number, number> = {};
    const hourCount: Record<number, number> = {};

    sessions.forEach(session => {
      const date = new Date(session.session_date);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();

      dayOfWeekCount[dayOfWeek] = (dayOfWeekCount[dayOfWeek] || 0) + 1;
      hourCount[hour] = (hourCount[hour] || 0) + 1;
    });

    const mostActiveDay =
      Object.entries(dayOfWeekCount).sort(([, a], [, b]) => b - a)[0]?.[0] || 0;

    const mostActiveHour =
      Object.entries(hourCount).sort(([, a], [, b]) => b - a)[0]?.[0] || 0;

    return {
      most_active_day: mostActiveDay,
      most_active_hour: mostActiveHour,
      day_distribution: dayOfWeekCount,
      hour_distribution: hourCount,
    };
  }

  private calculateRetentionScore(
    srsData: Array<{ quality_rating: number }>,
  ): number {
    if (srsData.length === 0) return 0;

    const qualityScores = srsData.map(s => s.quality_rating);
    const averageQuality =
      qualityScores.reduce((sum, score) => sum + score, 0) /
      qualityScores.length;

    // Retention score based on average quality (0-100 scale)
    return Math.round((averageQuality / 5) * 100);
  }
}

// Handler functions - Use AuthenticatedRequest and LearningAnalyticsService
async function handleGetStreakInfo(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new LearningAnalyticsService(supabaseClient, user);
  return await service.getStreakInfo();
}

async function handleGetPerformanceMetrics(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new LearningAnalyticsService(supabaseClient, user);
  return await service.getPerformanceMetrics();
}

async function handleGetCourseProgress(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new LearningAnalyticsService(supabaseClient, user);
  return await service.getCourseProgress();
}

async function handleGetStudyTimeAnalytics(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new LearningAnalyticsService(supabaseClient, user);
  return await service.getStudyTimeAnalytics();
}

async function handleGetRetentionMetrics(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new LearningAnalyticsService(supabaseClient, user);
  return await service.getRetentionMetrics();
}

// Route handlers - All handlers are wrapped with createAuthenticatedHandler
type HandlerFunction = (req: Request) => Promise<Response>;

function getHandler(action: string | null) {
  const handlers: Record<string, HandlerFunction> = {
    streak: wrapOldHandler(
      handleGetStreakInfo,
      'analytics-streak',
      undefined,
      false,
    ),
    performance: wrapOldHandler(
      handleGetPerformanceMetrics,
      'analytics-performance',
      undefined,
      false,
    ),
    progress: wrapOldHandler(
      handleGetCourseProgress,
      'analytics-progress',
      undefined,
      false,
    ),
    'study-time': wrapOldHandler(
      handleGetStudyTimeAnalytics,
      'analytics-study-time',
      undefined,
      false,
    ),
    retention: wrapOldHandler(
      handleGetRetentionMetrics,
      'analytics-retention',
      undefined,
      false,
    ),
  };

  return action ? handlers[action] : undefined;
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
    const action = pathParts[pathParts.length - 1];

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
      'Learning analytics error',
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
