import { supabase } from '@/services/supabase';
import { User } from '@/types';

// NOTE: This service uses direct Supabase queries for SRS configuration.
// TODO: Create API endpoints in api-v2 or extend srs-system for:
//   - GET /api-v2/srs/configuration (get SRS config)
//   - POST /api-v2/srs/schedule (schedule SRS reminders)
//   - GET /api-v2/srs/preferences (get SRS preferences)

export interface SRSUserPreferences {
  preferredStudyTimes: TimeSlot[];
  difficultyAdjustment: 'conservative' | 'moderate' | 'aggressive';
  reminderFrequency: 'minimal' | 'standard' | 'frequent';
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  customIntervals: number[];
  timezone: string;
}

export interface TimeSlot {
  start: string; // HH:MM format
  end: string; // HH:MM format
  days: number[]; // 0-6 (Sunday-Saturday)
}

export interface SRSConfiguration {
  intervals: number[];
  jitterMinutes: number;
  preferredHour: number;
  maxRemindersPerMonth: number;
}

export interface ScheduledReminder {
  id: string;
  session_id: string;
  reminder_time: string;
  reminder_type: 'spaced_repetition';
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high';
}

export class SRSSchedulingService {
  private static instance: SRSSchedulingService;

  public static getInstance(): SRSSchedulingService {
    if (!SRSSchedulingService.instance) {
      SRSSchedulingService.instance = new SRSSchedulingService();
    }
    return SRSSchedulingService.instance;
  }

  /**
   * Schedule SRS reminders for a study session
   */
  async scheduleReminders(
    sessionId: string,
    userId: string,
    sessionDate: Date,
    topic: string,
    preferences?: Partial<SRSUserPreferences>,
  ): Promise<ScheduledReminder[]> {
    try {
      // 1. Get user's SRS configuration
      const config = await this.getSRSConfiguration(userId, preferences);

      // 2. Calculate optimal intervals based on user performance
      const intervals = await this.calculateOptimalIntervals(
        userId,
        sessionId,
        config,
      );

      // 3. Generate reminders with user preferences
      const reminders = await this.createReminders(
        sessionId,
        userId,
        sessionDate,
        topic,
        intervals,
        config,
      );

      return reminders;
    } catch (error) {
      console.error('❌ Error scheduling SRS reminders:', error);
      throw error;
    }
  }

  /**
   * Get user's SRS configuration based on subscription and preferences
   */
  private async getSRSConfiguration(
    userId: string,
    preferences?: Partial<SRSUserPreferences>,
  ): Promise<SRSConfiguration> {
    try {
      // Get user's subscription tier
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      const subscriptionTier = userData.subscription_tier;

      // Get base intervals from database
      const { data: schedule, error: scheduleError } = await supabase
        .from('srs_schedules')
        .select('intervals')
        .eq('tier_restriction', subscriptionTier)
        .single();

      if (scheduleError || !schedule) {
        // Fallback to default intervals
        const defaultIntervals =
          subscriptionTier === 'oddity'
            ? [1, 3, 7, 14, 30, 60, 120, 180]
            : [1, 3, 7];

        return {
          intervals: defaultIntervals,
          jitterMinutes: 30,
          preferredHour: 10,
          maxRemindersPerMonth: subscriptionTier === 'oddity' ? 112 : 15,
        };
      }

      // Apply user preferences if provided
      let intervals = schedule.intervals;
      if (
        preferences?.customIntervals &&
        preferences.customIntervals.length > 0
      ) {
        intervals = preferences.customIntervals;
      }

      // Adjust intervals based on difficulty preference
      if (preferences?.difficultyAdjustment) {
        intervals = this.adjustIntervalsForDifficulty(
          intervals,
          preferences.difficultyAdjustment,
        );
      }

      return {
        intervals,
        jitterMinutes: preferences?.reminderFrequency === 'minimal' ? 60 : 30,
        preferredHour: this.getPreferredHour(preferences),
        maxRemindersPerMonth: subscriptionTier === 'oddity' ? 112 : 15,
      };
    } catch (error) {
      console.error('❌ Error getting SRS configuration:', error);
      throw error;
    }
  }

  /**
   * Calculate optimal intervals based on user performance history
   */
  private async calculateOptimalIntervals(
    userId: string,
    sessionId: string,
    config: SRSConfiguration,
  ): Promise<number[]> {
    try {
      // Get user's performance history for similar topics
      const { data: performanceHistory, error } = await supabase
        .from('srs_performance')
        .select('quality_rating, ease_factor, next_interval_days')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50); // Last 50 reviews

      if (error || !performanceHistory || performanceHistory.length === 0) {
        // No performance history, use default intervals
        return config.intervals;
      }

      // Analyze performance patterns
      const averageQuality =
        performanceHistory.reduce((sum, p) => sum + p.quality_rating, 0) /
        performanceHistory.length;
      const averageEaseFactor =
        performanceHistory.reduce((sum, p) => sum + p.ease_factor, 0) /
        performanceHistory.length;

      // Adjust intervals based on performance
      let adjustedIntervals = [...config.intervals];

      if (averageQuality < 3) {
        // User struggling, make intervals shorter
        adjustedIntervals = adjustedIntervals.map(interval =>
          Math.max(1, Math.floor(interval * 0.8)),
        );
      } else if (averageQuality > 4 && averageEaseFactor > 2.8) {
        // User excelling, make intervals longer
        adjustedIntervals = adjustedIntervals.map(interval =>
          Math.floor(interval * 1.2),
        );
      }

      return adjustedIntervals;
    } catch (error) {
      console.error('❌ Error calculating optimal intervals:', error);
      return config.intervals; // Fallback to default
    }
  }

  /**
   * Create reminders with timezone awareness and jitter
   */
  private async createReminders(
    sessionId: string,
    userId: string,
    sessionDate: Date,
    topic: string,
    intervals: number[],
    config: SRSConfiguration,
  ): Promise<ScheduledReminder[]> {
    try {
      const remindersToInsert = await Promise.all(
        intervals.map(async days => {
          // Use timezone-aware scheduling
          const { data: timezoneAwareTime, error: tzError } =
            await supabase.rpc('schedule_reminder_in_user_timezone', {
              p_user_id: userId,
              p_base_time: sessionDate.toISOString(),
              p_days_offset: days,
              p_hour: config.preferredHour,
            });

          let reminderTime: Date;

          if (tzError || !timezoneAwareTime) {
            // Fallback to UTC calculation
            reminderTime = new Date(sessionDate);
            reminderTime.setDate(sessionDate.getDate() + days);
            reminderTime.setHours(config.preferredHour, 0, 0, 0);
          } else {
            reminderTime = new Date(timezoneAwareTime);
          }

          // Apply deterministic jitter (same session + interval = same jitter)
          // This makes scheduling predictable for testing while still preventing clustering
          const seed = `${sessionId}-${days}`;
          const jitteredTime = this.addDeterministicJitter(
            reminderTime,
            config.jitterMinutes,
            seed,
          );

          return {
            user_id: userId,
            session_id: sessionId,
            reminder_time: jitteredTime.toISOString(),
            reminder_type: 'spaced_repetition' as const,
            title: `Spaced Repetition: Review "${topic}"`,
            body: `It's time to review your study session on "${topic}" to strengthen your memory.`,
            completed: false,
            priority: 'medium' as const,
          };
        }),
      );

      // Cancel existing incomplete reminders for this session before inserting new ones
      const now = new Date().toISOString();
      await supabase
        .from('reminders')
        .update({
          completed: true,
          processed_at: now,
          action_taken: 'rescheduled',
        })
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .in('reminder_type', ['spaced_repetition', 'srs_review'])
        .eq('completed', false)
        .gt('reminder_time', now);

      // Insert reminders into database
      const { data: insertedReminders, error: insertError } = await supabase
        .from('reminders')
        .insert(remindersToInsert)
        .select();

      if (insertError) {
        throw new Error(`Failed to insert reminders: ${insertError.message}`);
      }

      return insertedReminders.map(reminder => ({
        id: reminder.id,
        session_id: reminder.session_id,
        reminder_time: reminder.reminder_time,
        reminder_type: reminder.reminder_type,
        title: reminder.title,
        body: reminder.body,
        priority: reminder.priority,
      }));
    } catch (error) {
      console.error('❌ Error creating reminders:', error);
      throw error;
    }
  }

  /**
   * Adjust intervals based on difficulty preference
   */
  private adjustIntervalsForDifficulty(
    intervals: number[],
    difficulty: string,
  ): number[] {
    switch (difficulty) {
      case 'conservative':
        return intervals.map(interval =>
          Math.max(1, Math.floor(interval * 0.8)),
        );
      case 'aggressive':
        return intervals.map(interval => Math.floor(interval * 1.3));
      case 'moderate':
      default:
        return intervals;
    }
  }

  /**
   * Get preferred hour from user preferences
   */
  private getPreferredHour(preferences?: Partial<SRSUserPreferences>): number {
    if (
      preferences?.preferredStudyTimes &&
      preferences.preferredStudyTimes.length > 0
    ) {
      // Use the first preferred time slot's start hour
      const firstSlot = preferences.preferredStudyTimes[0];
      return parseInt(firstSlot.start.split(':')[0]);
    }
    return 10; // Default to 10 AM
  }

  /**
   * Generate deterministic "random" value based on seed
   * Same seed produces same value - useful for testing and consistency
   */
  private seededRandom(seed: string, max: number): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Map to range [-max, max]
    return (Math.abs(hash) % (max * 2 + 1)) - max;
  }

  /**
   * Add deterministic jitter to a date based on a seed
   * Same inputs produce same jittered time (useful for testing)
   */
  private addDeterministicJitter(
    date: Date,
    maxMinutes: number,
    seed: string,
  ): Date {
    const jitterValue = this.seededRandom(seed, maxMinutes);
    return new Date(date.getTime() + jitterValue * 60000);
  }

  /**
   * Add random jitter to a date (non-deterministic)
   * Use when you need true randomness
   */
  private addRandomJitter(date: Date, maxMinutes: number): Date {
    const jitterMinutes =
      Math.floor(Math.random() * (maxMinutes * 2 + 1)) - maxMinutes;
    return new Date(date.getTime() + jitterMinutes * 60000);
  }

  /**
   * Update user's SRS preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<SRSUserPreferences>,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          srs_preferences: preferences,
        })
        .eq('id', userId);

      if (error) {
        throw new Error(`Failed to update SRS preferences: ${error.message}`);
      }
    } catch (error) {
      console.error('❌ Error updating SRS preferences:', error);
      throw error;
    }
  }

  /**
   * Get user's SRS preferences
   */
  async getUserPreferences(userId: string): Promise<SRSUserPreferences | null> {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('srs_preferences')
        .eq('id', userId)
        .single();

      if (error || !userData) {
        return null;
      }

      return userData.srs_preferences as SRSUserPreferences;
    } catch (error) {
      console.error('❌ Error getting SRS preferences:', error);
      return null;
    }
  }
}
