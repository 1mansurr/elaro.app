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
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createResponse } from '../_shared/response.ts';
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
  constructor(private supabaseClient: any, private user: any) {}

  async recordPerformance(data: any) {
    const { session_id, reminder_id, quality_rating, response_time_seconds, schedule_next } = 
      RecordSRSPerformanceSchema.parse(data);

    console.log(`Recording SRS performance for session ${session_id}, quality: ${quality_rating}`);

    // 1. Verify the study session belongs to the user
    const { data: session, error: sessionError } = await this.supabaseClient
      .from('study_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', this.user.id)
      .single();

    if (sessionError || !session) {
      throw new AppError('Study session not found or access denied', 404, 'NOT_FOUND');
    }

    // 2. Get or create SRS record for this session
    const { data: existingSRS, error: srsError } = await this.supabaseClient
      .from('srs_performance')
      .select('*')
      .eq('session_id', session_id)
      .single();

    let srsRecord;
    if (srsError && srsError.code === 'PGRST116') {
      // No existing record, create new one
      const { data: newSRS, error: createError } = await this.supabaseClient
        .from('srs_performance')
        .insert({
          user_id: this.user.id,
          session_id,
          quality_rating,
          response_time_seconds,
          review_count: 1,
          last_reviewed_at: new Date().toISOString(),
          next_review_at: this.calculateNextReview(new Date(), quality_rating, 1),
        })
        .select()
        .single();

      if (createError) {
        throw new AppError(createError.message, 500, 'DB_INSERT_ERROR');
      }
      srsRecord = newSRS;
    } else if (srsError) {
      throw new AppError(srsError.message, 500, 'DB_QUERY_ERROR');
    } else {
      // Update existing record
      const newReviewCount = existingSRS.review_count + 1;
      const nextReview = schedule_next 
        ? this.calculateNextReview(new Date(), quality_rating, newReviewCount)
        : existingSRS.next_review_at;

      const { data: updatedSRS, error: updateError } = await this.supabaseClient
        .from('srs_performance')
        .update({
          quality_rating,
          response_time_seconds,
          review_count: newReviewCount,
          last_reviewed_at: new Date().toISOString(),
          next_review_at: nextReview,
        })
        .eq('id', existingSRS.id)
        .select()
        .single();

      if (updateError) {
        throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
      }
      srsRecord = updatedSRS;
    }

    // 3. Update reminder if provided
    if (reminder_id) {
      const { error: reminderError } = await this.supabaseClient
        .from('reminders')
        .update({ 
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', reminder_id)
        .eq('user_id', this.user.id);

      if (reminderError) {
        console.error('Failed to update reminder:', reminderError);
        // Non-critical error
      }
    }

    return srsRecord;
  }

  async getPerformance(sessionId: string) {
    const { data: performance, error } = await this.supabaseClient
      .from('srs_performance')
      .select(`
        *,
        study_sessions (
          id,
          topic,
          session_date
        )
      `)
      .eq('session_id', sessionId)
      .eq('user_id', this.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError('SRS performance not found', 404, 'NOT_FOUND');
      }
      throw new AppError(error.message, 500, 'DB_QUERY_ERROR');
    }

    return performance;
  }

  async getNextReview() {
    const now = new Date().toISOString();
    
    const { data: nextReviews, error } = await this.supabaseClient
      .from('srs_performance')
      .select(`
        *,
        study_sessions (
          id,
          topic,
          session_date,
          notes
        )
      `)
      .eq('user_id', this.user.id)
      .lte('next_review_at', now)
      .order('next_review_at', { ascending: true })
      .limit(10);

    if (error) {
      throw new AppError(error.message, 500, 'DB_QUERY_ERROR');
    }

    return nextReviews;
  }

  async scheduleReview(data: any) {
    const { session_id, next_review_date, interval_days } = ScheduleReviewSchema.parse(data);

    // Verify session ownership
    const { data: session, error: sessionError } = await this.supabaseClient
      .from('study_sessions')
      .select('id')
      .eq('id', session_id)
      .eq('user_id', this.user.id)
      .single();

    if (sessionError || !session) {
      throw new AppError('Study session not found or access denied', 404, 'NOT_FOUND');
    }

    // Update or create SRS record
    const { data: srsRecord, error: updateError } = await this.supabaseClient
      .from('srs_performance')
      .upsert({
        user_id: this.user.id,
        session_id,
        next_review_at: next_review_date,
        interval_days,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (updateError) {
      throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
    }

    return srsRecord;
  }

  async getStatistics() {
    const { data: stats, error } = await this.supabaseClient
      .from('srs_performance')
      .select('quality_rating, review_count, last_reviewed_at, next_review_at')
      .eq('user_id', this.user.id);

    if (error) {
      throw new AppError(error.message, 500, 'DB_QUERY_ERROR');
    }

    const totalReviews = stats.length;
    const averageQuality = stats.reduce((sum, s) => sum + s.quality_rating, 0) / totalReviews;
    const totalReviewCount = stats.reduce((sum, s) => sum + s.review_count, 0);
    
    const now = new Date();
    const dueForReview = stats.filter(s => new Date(s.next_review_at) <= now).length;

    return {
      total_sessions: totalReviews,
      total_reviews: totalReviewCount,
      average_quality: Math.round(averageQuality * 100) / 100,
      due_for_review: dueForReview,
      review_distribution: this.getQualityDistribution(stats),
    };
  }

  private calculateNextReview(lastReview: Date, quality: number, reviewCount: number): string {
    // Simple SRS algorithm - can be enhanced
    let intervalDays = 1;
    
    if (quality >= 4) {
      intervalDays = Math.min(reviewCount * 2, 30); // Exponential growth, max 30 days
    } else if (quality >= 3) {
      intervalDays = Math.min(reviewCount, 7); // Linear growth, max 7 days
    } else if (quality >= 2) {
      intervalDays = 1; // Review tomorrow
    } else {
      intervalDays = 1; // Review tomorrow
    }

    const nextReview = new Date(lastReview);
    nextReview.setDate(nextReview.getDate() + intervalDays);
    return nextReview.toISOString();
  }

  private getQualityDistribution(stats: any[]): Record<number, number> {
    const distribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    stats.forEach(stat => {
      distribution[stat.quality_rating] = (distribution[stat.quality_rating] || 0) + 1;
    });

    return distribution;
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

    // Create SRS service
    const srsService = new SRSService(supabaseClient, user);

    // Route to appropriate handler
    switch (action) {
      case 'record-performance':
        const performanceData = await req.json();
        const performance = await srsService.recordPerformance(performanceData);
        return createResponse({ data: performance }, 200);

      case 'performance':
        const sessionId = pathParts[pathParts.length - 2]; // Get ID from path
        const sessionPerformance = await srsService.getPerformance(sessionId);
        return createResponse({ data: sessionPerformance }, 200);

      case 'next-review':
        const nextReviews = await srsService.getNextReview();
        return createResponse({ data: nextReviews }, 200);

      case 'schedule-review':
        const scheduleData = await req.json();
        const scheduledReview = await srsService.scheduleReview(scheduleData);
        return createResponse({ data: scheduledReview }, 200);

      case 'statistics':
        const statistics = await srsService.getStatistics();
        return createResponse({ data: statistics }, 200);

      default:
        return createResponse({ error: 'Invalid action' }, 404);
    }

  } catch (error) {
    console.error('SRS system error:', error);
    return createResponse({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, 500);
  }
});
