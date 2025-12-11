import { supabase } from '@/services/supabase';
import { weeklyAnalyticsService } from './WeeklyAnalyticsService';
import { AppError } from '@/utils/AppError';
import { AnalyticsUser } from '@/types/service-responses';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface BatchProcessingLog {
  id: string;
  processing_date: string;
  total_users: number;
  processed_users: number;
  successful_reports: number;
  failed_reports: number;
  skipped_users: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
}

export interface ProcessingUser {
  id: string;
  subscription_tier: string;
  last_activity: string;
  timezone: string;
  priority: number;
}

// ============================================================================
// BATCH PROCESSING SERVICE
// ============================================================================

export class BatchProcessingService {
  private static instance: BatchProcessingService;
  private static readonly BATCH_SIZE = 50;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 3 * 60 * 60 * 1000; // 3 hours

  public static getInstance(): BatchProcessingService {
    if (!BatchProcessingService.instance) {
      BatchProcessingService.instance = new BatchProcessingService();
    }
    return BatchProcessingService.instance;
  }

  // ============================================================================
  // BATCH PROCESSING METHODS
  // ============================================================================

  /**
   * Process weekly reports for all eligible users
   * TEMPORARY: This feature is currently disabled
   */
  async processWeeklyReports(): Promise<BatchProcessingLog> {
    // TEMPORARY: Weekly report generation is disabled
    console.log('⚠️ Weekly report generation is temporarily disabled');
    throw new AppError(
      'Weekly report generation is temporarily disabled',
      503,
      'FEATURE_DISABLED',
      { feature: 'weekly_reports' },
    );

    /* DISABLED - Uncomment to re-enable weekly reports
    const processingDate = new Date().toISOString().split('T')[0];

    try {
      // Create processing log
      const { data: log, error: logError } = await supabase
        .from('batch_processing_logs')
        .insert({
          processing_date: processingDate,
          total_users: 0,
          processed_users: 0,
          successful_reports: 0,
          failed_reports: 0,
          skipped_users: 0,
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (logError) {
        throw new AppError(
          `Failed to create processing log: ${logError.message}`,
          500,
          'LOG_CREATION_ERROR',
          { processingDate },
        );
      }

      try {
        // Get eligible users
        const eligibleUsers = await this.getEligibleUsers();

        // Update total users count
        await this.updateProcessingLog(log.id, {
          total_users: eligibleUsers.length,
        });

        // Process users in batches
        let processedUsers = 0;
        let successfulReports = 0;
        let failedReports = 0;
        let skippedUsers = 0;

        for (
          let i = 0;
          i < eligibleUsers.length;
          i += BatchProcessingService.BATCH_SIZE
        ) {
          const batch = eligibleUsers.slice(
            i,
            i + BatchProcessingService.BATCH_SIZE,
          );

          const batchResults = await this.processBatch(batch);

          processedUsers += batchResults.processed;
          successfulReports += batchResults.successful;
          failedReports += batchResults.failed;
          skippedUsers += batchResults.skipped;

          // Update progress
          await this.updateProcessingLog(log.id, {
            processed_users: processedUsers,
            successful_reports: successfulReports,
            failed_reports: failedReports,
            skipped_users: skippedUsers,
          });

          // Add delay between batches to prevent overwhelming the system
          if (i + BatchProcessingService.BATCH_SIZE < eligibleUsers.length) {
            await this.delay(1000); // 1 second delay
          }
        }

        // Mark as completed
        await this.updateProcessingLog(log.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        });

        return {
          ...log,
          total_users: eligibleUsers.length,
          processed_users: processedUsers,
          successful_reports: successfulReports,
          failed_reports: failedReports,
          skipped_users: skippedUsers,
          status: 'completed',
          completed_at: new Date().toISOString(),
        };
      } catch (error) {
        // Mark as failed
        await this.updateProcessingLog(log.id, {
          status: 'failed',
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        });

        throw error;
      }
    } catch (error) {
      throw new AppError(
        `Error processing weekly reports: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'BATCH_PROCESSING_ERROR',
        { processingDate },
      );
    }
    */ // END DISABLED CODE
  }

  /**
   * Retry failed report generations
   */
  async retryFailedReports(): Promise<void> {
    try {
      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

      // Get failed reports from the last 3 hours
      const { data: failedReports, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('status', 'failed')
        .gte('updated_at', threeHoursAgo.toISOString());

      if (error) {
        throw new AppError(
          `Failed to get failed reports: ${error.message}`,
          500,
          'RETRY_FETCH_ERROR',
        );
      }

      if (!failedReports || failedReports.length === 0) {
        console.log('No failed reports to retry');
        return;
      }

      console.log(`Retrying ${failedReports.length} failed reports`);

      // Retry each failed report
      for (const report of failedReports) {
        try {
          const weekStart = new Date(report.week_start_date);
          const weekEnd = new Date(report.week_end_date);

          // Regenerate the report
          await weeklyAnalyticsService.generateWeeklyReport(
            report.user_id,
            weekStart,
            weekEnd,
          );

          console.log(`Successfully retried report for user ${report.user_id}`);
        } catch (error) {
          console.error(
            `Failed to retry report for user ${report.user_id}:`,
            error,
          );
        }
      }
    } catch (error) {
      throw new AppError(
        `Error retrying failed reports: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'RETRY_ERROR',
      );
    }
  }

  /**
   * Get processing status
   */
  async getProcessingStatus(): Promise<BatchProcessingLog[]> {
    try {
      const { data, error } = await supabase
        .from('batch_processing_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        throw new AppError(
          `Failed to get processing status: ${error.message}`,
          500,
          'STATUS_FETCH_ERROR',
        );
      }

      return data || [];
    } catch (error) {
      throw new AppError(
        `Error getting processing status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'STATUS_FETCH_ERROR',
      );
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getEligibleUsers(): Promise<ProcessingUser[]> {
    try {
      // Get users with activity in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: users, error } = await supabase
        .from('users')
        .select(
          `
          id,
          subscription_tier,
          last_activity,
          timezone
        `,
        )
        .gte('last_activity', sevenDaysAgo.toISOString())
        .in('subscription_tier', ['oddity', 'admin']); // Only paid users

      if (error) {
        throw new AppError(
          `Failed to get eligible users: ${error.message}`,
          500,
          'USER_FETCH_ERROR',
        );
      }

      // Prioritize users based on activity and subscription
      return (users || [])
        .map(user => ({
          id: user.id,
          subscription_tier: user.subscription_tier,
          last_activity: user.last_activity,
          timezone: user.timezone || 'UTC',
          priority: this.calculateUserPriority(user),
        }))
        .sort((a, b) => b.priority - a.priority);
    } catch (error) {
      throw new AppError(
        `Error getting eligible users: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'USER_FETCH_ERROR',
      );
    }
  }

  private calculateUserPriority(user: AnalyticsUser): number {
    let priority = 0;

    // Subscription tier priority
    if (user.subscription_tier === 'admin') priority += 100;
    else if (user.subscription_tier === 'oddity') priority += 50;

    // Activity recency priority
    const lastActivity = new Date(user.last_activity);
    const daysSinceActivity =
      (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceActivity < 1) priority += 30;
    else if (daysSinceActivity < 3) priority += 20;
    else if (daysSinceActivity < 7) priority += 10;

    return priority;
  }

  private async processBatch(users: ProcessingUser[]): Promise<{
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
  }> {
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    for (const user of users) {
      try {
        // Check if user has very low activity (skip if no activity)
        const hasActivity = await this.checkUserActivity(user.id);
        if (!hasActivity) {
          skipped++;
          continue;
        }

        // Generate report for the previous week
        const weekStart = this.getPreviousWeekStart(user.timezone);
        const weekEnd = this.getPreviousWeekEnd(user.timezone);

        await weeklyAnalyticsService.generateWeeklyReport(
          user.id,
          weekStart,
          weekEnd,
        );

        successful++;
        processed++;
      } catch (error) {
        console.error(`Failed to process user ${user.id}:`, error);
        failed++;
        processed++;
      }
    }

    return { processed, successful, failed, skipped };
  }

  private async checkUserActivity(userId: string): Promise<boolean> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Check for any activity in the last 7 days
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(1);

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(1);

      return (sessions?.length || 0) > 0 || (tasks?.length || 0) > 0;
    } catch (error) {
      console.error(`Error checking activity for user ${userId}:`, error);
      return false;
    }
  }

  private getPreviousWeekStart(timezone: string): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 7 : dayOfWeek; // Sunday = 0, so subtract 7

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - daysToSubtract);
    weekStart.setHours(0, 0, 0, 0);

    return weekStart;
  }

  private getPreviousWeekEnd(timezone: string): Date {
    const weekStart = this.getPreviousWeekStart(timezone);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return weekEnd;
  }

  private async updateProcessingLog(
    logId: string,
    updates: Partial<BatchProcessingLog>,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('batch_processing_logs')
        .update(updates)
        .eq('id', logId);

      if (error) {
        console.error('Error updating processing log:', error);
      }
    } catch (error) {
      console.error('Error updating processing log:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const batchProcessingService = BatchProcessingService.getInstance();
