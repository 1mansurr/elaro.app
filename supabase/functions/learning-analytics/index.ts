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

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { createResponse } from '../_shared/response.ts';
import { AppError } from '../_shared/response.ts';

// Learning Analytics service class
class LearningAnalyticsService {
  constructor(private supabaseClient: any, private user: any) {}

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
      throw new AppError(error.message, 500, 'DB_QUERY_ERROR');
    }

    // Calculate current streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sessionDates = sessions.map(s => {
      const date = new Date(s.session_date);
      date.setHours(0, 0, 0, 0);
      return date;
    });

    // Calculate current streak (consecutive days from today backwards)
    let checkDate = new Date(today);
    while (sessionDates.some(d => d.getTime() === checkDate.getTime())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate longest streak
    for (let i = 0; i < sessionDates.length; i++) {
      if (i === 0 || sessionDates[i].getTime() - sessionDates[i-1].getTime() === 86400000) {
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
      last_study_date: sessions.length > 0 ? sessions[sessions.length - 1].session_date : null,
    };
  }

  async getPerformanceMetrics() {
    // Get SRS performance data
    const { data: srsData, error: srsError } = await this.supabaseClient
      .from('srs_performance')
      .select('quality_rating, review_count, last_reviewed_at')
      .eq('user_id', this.user.id);

    if (srsError) {
      throw new AppError(srsError.message, 500, 'DB_QUERY_ERROR');
    }

    // Get study session data
    const { data: sessions, error: sessionError } = await this.supabaseClient
      .from('study_sessions')
      .select('session_date, has_spaced_repetition')
      .eq('user_id', this.user.id)
      .is('deleted_at', null);

    if (sessionError) {
      throw new AppError(sessionError.message, 500, 'DB_QUERY_ERROR');
    }

    // Calculate metrics
    const totalSessions = sessions.length;
    const srsSessions = sessions.filter(s => s.has_spaced_repetition).length;
    const averageQuality = srsData.length > 0 
      ? srsData.reduce((sum, s) => sum + s.quality_rating, 0) / srsData.length 
      : 0;
    const totalReviews = srsData.reduce((sum, s) => sum + s.review_count, 0);

    return {
      total_sessions: totalSessions,
      srs_sessions: srsSessions,
      srs_adoption_rate: totalSessions > 0 ? (srsSessions / totalSessions) * 100 : 0,
      average_quality_rating: Math.round(averageQuality * 100) / 100,
      total_reviews: totalReviews,
      reviews_per_session: srsSessions > 0 ? totalReviews / srsSessions : 0,
    };
  }

  async getCourseProgress() {
    // Get courses with their assignments and study sessions
    const { data: courses, error: courseError } = await this.supabaseClient
      .from('courses')
      .select(`
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
      `)
      .eq('user_id', this.user.id)
      .is('deleted_at', null);

    if (courseError) {
      throw new AppError(courseError.message, 500, 'DB_QUERY_ERROR');
    }

    const courseProgress = courses.map(course => {
      const activeAssignments = course.assignments.filter(a => !a.deleted_at);
      const activeSessions = course.study_sessions.filter(s => !s.deleted_at);
      
      const upcomingAssignments = activeAssignments.filter(a => 
        new Date(a.due_date) > new Date()
      ).length;

      const recentSessions = activeSessions.filter(s => {
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
        activity_score: this.calculateActivityScore(activeSessions, activeAssignments),
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
      throw new AppError(error.message, 500, 'DB_QUERY_ERROR');
    }

    // Calculate time-based analytics
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weeklySessions = sessions.filter(s => new Date(s.session_date) >= lastWeek).length;
    const monthlySessions = sessions.filter(s => new Date(s.session_date) >= lastMonth).length;

    // Calculate study patterns
    const studyDays = new Set(sessions.map(s => {
      const date = new Date(s.session_date);
      return date.toISOString().split('T')[0];
    }));

    const studyPattern = this.analyzeStudyPattern(sessions);

    return {
      total_sessions: sessions.length,
      weekly_sessions: weeklySessions,
      monthly_sessions: monthlySessions,
      unique_study_days: studyDays.size,
      study_pattern: studyPattern,
      average_sessions_per_day: studyDays.size > 0 ? sessions.length / studyDays.size : 0,
    };
  }

  async getRetentionMetrics() {
    // Get SRS performance for retention analysis
    const { data: srsData, error } = await this.supabaseClient
      .from('srs_performance')
      .select('quality_rating, review_count, last_reviewed_at, next_review_at')
      .eq('user_id', this.user.id);

    if (error) {
      throw new AppError(error.message, 500, 'DB_QUERY_ERROR');
    }

    // Calculate retention metrics
    const totalItems = srsData.length;
    const masteredItems = srsData.filter(s => s.quality_rating >= 4).length;
    const strugglingItems = srsData.filter(s => s.quality_rating <= 2).length;
    
    const now = new Date();
    const dueForReview = srsData.filter(s => new Date(s.next_review_at) <= now).length;
    
    const averageReviewCount = totalItems > 0 
      ? srsData.reduce((sum, s) => sum + s.review_count, 0) / totalItems 
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

  private calculateActivityScore(sessions: any[], assignments: any[]): number {
    const recentSessions = sessions.filter(s => {
      const sessionDate = new Date(s.session_date);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return sessionDate >= sevenDaysAgo;
    }).length;

    const upcomingAssignments = assignments.filter(a => 
      new Date(a.due_date) > new Date()
    ).length;

    // Simple scoring: recent sessions + upcoming assignments
    return Math.min(recentSessions + upcomingAssignments, 10);
  }

  private analyzeStudyPattern(sessions: any[]): any {
    const dayOfWeekCount: Record<number, number> = {};
    const hourCount: Record<number, number> = {};

    sessions.forEach(session => {
      const date = new Date(session.session_date);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();

      dayOfWeekCount[dayOfWeek] = (dayOfWeekCount[dayOfWeek] || 0) + 1;
      hourCount[hour] = (hourCount[hour] || 0) + 1;
    });

    const mostActiveDay = Object.entries(dayOfWeekCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 0;
    
    const mostActiveHour = Object.entries(hourCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 0;

    return {
      most_active_day: mostActiveDay,
      most_active_hour: mostActiveHour,
      day_distribution: dayOfWeekCount,
      hour_distribution: hourCount,
    };
  }

  private calculateRetentionScore(srsData: any[]): number {
    if (srsData.length === 0) return 0;

    const qualityScores = srsData.map(s => s.quality_rating);
    const averageQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    
    // Retention score based on average quality (0-100 scale)
    return Math.round((averageQuality / 5) * 100);
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

    // Create learning analytics service
    const analyticsService = new LearningAnalyticsService(supabaseClient, user);

    // Route to appropriate handler
    switch (action) {
      case 'streak':
        const streakInfo = await analyticsService.getStreakInfo();
        return createResponse({ data: streakInfo }, 200);

      case 'performance':
        const performance = await analyticsService.getPerformanceMetrics();
        return createResponse({ data: performance }, 200);

      case 'progress':
        const progress = await analyticsService.getCourseProgress();
        return createResponse({ data: progress }, 200);

      case 'study-time':
        const studyTime = await analyticsService.getStudyTimeAnalytics();
        return createResponse({ data: studyTime }, 200);

      case 'retention':
        const retention = await analyticsService.getRetentionMetrics();
        return createResponse({ data: retention }, 200);

      default:
        return createResponse({ error: 'Invalid action' }, 404);
    }

  } catch (error) {
    console.error('Learning analytics error:', error);
    return createResponse({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, 500);
  }
});
