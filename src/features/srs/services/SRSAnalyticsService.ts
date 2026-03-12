import { getDatabase } from '@/services/database';
import { getOrCreateDeviceId } from '@/utils/deviceId';

export interface LearningInsights {
  retentionRate: number;
  learningVelocity: number;
  difficultyPatterns: DifficultyPattern[];
  optimalStudyTimes: TimeSlot[];
  recommendations: string[];
  masteryLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface DifficultyPattern {
  topic: string;
  difficultyScore: number;
  improvement: 'improving' | 'stable' | 'declining';
  trend: number[]; // Last 7 performance scores
}

export interface TimeSlot {
  hour: number;
  performance: number;
  frequency: number;
}

export interface PerformanceDashboard {
  weeklyProgress: WeeklyProgress;
  topicMastery: TopicMastery[];
  studyStreaks: StudyStreak[];
  upcomingReviews: UpcomingReview[];
  overallStats: OverallStats;
}

export interface WeeklyProgress {
  week: string;
  reviewsCompleted: number;
  averageQuality: number;
  retentionRate: number;
  timeSpent: number; // in minutes
}

export interface TopicMastery {
  sessionId: string;
  topic: string;
  masteryLevel: number; // 0-100
  lastReviewed: string;
  nextReview: string;
  easeFactor: number;
  reviewCount: number;
}

export interface StudyStreak {
  startDate: string;
  endDate?: string;
  length: number;
  isActive: boolean;
}

export interface UpcomingReview {
  sessionId: string;
  topic: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  estimatedDifficulty: number;
}

export interface OverallStats {
  totalReviews: number;
  averageQuality: number;
  retentionRate: number;
  topicsReviewed: number;
  averageEaseFactor: number;
  studyTimeTotal: number; // in minutes
  longestStreak: number;
  currentStreak: number;
}

// Row types for SQLite queries
interface SRSItemRow {
  id: string;
  topic: string;
  ease_factor: number;
  last_quality_rating: number | null;
  last_reviewed_at: string | null;
  next_review_date: string;
  repetitions: number;
}

interface ReminderRow {
  id: string;
  srs_item_id: string | null;
  scheduled_time: string;
  topic: string | null;
}

export class SRSAnalyticsService {
  private static instance: SRSAnalyticsService;

  public static getInstance(): SRSAnalyticsService {
    if (!SRSAnalyticsService.instance) {
      SRSAnalyticsService.instance = new SRSAnalyticsService();
    }
    return SRSAnalyticsService.instance;
  }

  /**
   * Generate comprehensive learning insights for a user
   */
  async generateLearningInsights(_userId: string): Promise<LearningInsights> {
    try {
      const [
        retentionRate,
        learningVelocity,
        difficultyPatterns,
        optimalStudyTimes,
        masteryLevel,
      ] = await Promise.all([
        this.calculateRetentionRate(),
        this.calculateLearningVelocity(),
        this.analyzeDifficultyPatterns(),
        this.findOptimalStudyTimes(),
        this.calculateMasteryLevel(),
      ]);

      const recommendations = this.buildRecommendations(
        retentionRate,
        learningVelocity,
        difficultyPatterns,
        optimalStudyTimes,
        masteryLevel,
      );

      return {
        retentionRate,
        learningVelocity,
        difficultyPatterns,
        optimalStudyTimes,
        recommendations,
        masteryLevel,
      };
    } catch (error) {
      console.error('❌ Error generating learning insights:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive performance dashboard
   */
  async getPerformanceDashboard(
    _userId: string,
  ): Promise<PerformanceDashboard> {
    try {
      const [
        weeklyProgressList,
        topicMastery,
        studyStreaks,
        upcomingReviews,
        overallStats,
      ] = await Promise.all([
        this.getWeeklyProgress(),
        this.getTopicMasteryLevels(),
        this.getStudyStreaks(),
        this.getUpcomingReviews(),
        this.getOverallStats(),
      ]);

      return {
        weeklyProgress: weeklyProgressList[0] ?? {
          week: '',
          reviewsCompleted: 0,
          averageQuality: 0,
          retentionRate: 0,
          timeSpent: 0,
        },
        topicMastery,
        studyStreaks,
        upcomingReviews,
        overallStats,
      };
    } catch (error) {
      console.error('❌ Error getting performance dashboard:', error);
      throw error;
    }
  }

  // ─── Private helpers ─────────────────────────────────────────

  private async getReviewedItems(): Promise<SRSItemRow[]> {
    const db = await getDatabase();
    const deviceId = await getOrCreateDeviceId();
    return db.getAllAsync<SRSItemRow>(
      `SELECT id, topic, ease_factor, last_quality_rating, last_reviewed_at,
              next_review_date, repetitions
       FROM srs_items
       WHERE user_id = ? AND last_quality_rating IS NOT NULL`,
      [deviceId],
    );
  }

  /**
   * Calculate retention rate based on srs_items last_quality_rating
   */
  private async calculateRetentionRate(): Promise<number> {
    try {
      const items = await this.getReviewedItems();
      if (items.length === 0) return 0;
      const successful = items.filter(
        i => (i.last_quality_rating ?? 0) >= 3,
      ).length;
      return (successful / items.length) * 100;
    } catch (error) {
      console.error('❌ Error calculating retention rate:', error);
      return 0;
    }
  }

  /**
   * Calculate learning velocity as ease-factor improvement over baseline
   */
  private async calculateLearningVelocity(): Promise<number> {
    try {
      const items = await this.getReviewedItems();
      if (items.length < 2) return 0;
      // Proxy: items whose ease_factor exceeds the SM-2 default (2.5) indicate
      // positive learning momentum.
      const avgEase =
        items.reduce((sum, i) => sum + i.ease_factor, 0) / items.length;
      return Math.max(0, (avgEase - 2.5) * 50); // 0-50 range approximation
    } catch (error) {
      console.error('❌ Error calculating learning velocity:', error);
      return 0;
    }
  }

  /**
   * Analyze difficulty patterns per topic using srs_items
   */
  private async analyzeDifficultyPatterns(): Promise<DifficultyPattern[]> {
    try {
      const items = await this.getReviewedItems();
      if (items.length === 0) return [];

      // Group by topic
      const topicGroups = items.reduce(
        (groups, item) => {
          if (!groups[item.topic]) groups[item.topic] = [];
          groups[item.topic].push(item);
          return groups;
        },
        {} as Record<string, SRSItemRow[]>,
      );

      const patterns: DifficultyPattern[] = [];

      for (const [topic, topicItems] of Object.entries(topicGroups)) {
        if (topicItems.length < 3) continue;

        const qualityScores = topicItems
          .slice(0, 7)
          .map(i => i.last_quality_rating ?? 0);

        const avgQuality =
          qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length;
        const difficultyScore = 5 - avgQuality;

        // Determine trend using ease_factor relative to baseline
        const avgEase =
          topicItems.reduce((sum, i) => sum + i.ease_factor, 0) /
          topicItems.length;

        let improvement: 'improving' | 'stable' | 'declining' = 'stable';
        if (avgEase > 2.7) improvement = 'improving';
        else if (avgEase < 2.3) improvement = 'declining';

        patterns.push({
          topic,
          difficultyScore,
          improvement,
          trend: qualityScores,
        });
      }

      return patterns.sort((a, b) => b.difficultyScore - a.difficultyScore);
    } catch (error) {
      console.error('❌ Error analyzing difficulty patterns:', error);
      return [];
    }
  }

  /**
   * Find optimal study times from last_reviewed_at hours
   */
  private async findOptimalStudyTimes(): Promise<TimeSlot[]> {
    try {
      const items = await this.getReviewedItems();
      const withTime = items.filter(i => i.last_reviewed_at !== null);
      if (withTime.length === 0) return [];

      const hourGroups = withTime.reduce(
        (groups, item) => {
          const hour = new Date(item.last_reviewed_at!).getHours();
          if (!groups[hour]) groups[hour] = { scores: [], count: 0 };
          groups[hour].scores.push(item.last_quality_rating ?? 0);
          groups[hour].count++;
          return groups;
        },
        {} as Record<number, { scores: number[]; count: number }>,
      );

      const timeSlots: TimeSlot[] = [];

      for (const [hour, data] of Object.entries(hourGroups)) {
        if (data.count < 3) continue;
        const performance =
          data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length;
        timeSlots.push({
          hour: parseInt(hour, 10),
          performance,
          frequency: data.count,
        });
      }

      return timeSlots
        .sort((a, b) => b.performance - a.performance)
        .slice(0, 5);
    } catch (error) {
      console.error('❌ Error finding optimal study times:', error);
      return [];
    }
  }

  /**
   * Build personalized recommendations from pre-computed insights (no extra DB call)
   */
  private buildRecommendations(
    retentionRate: number,
    learningVelocity: number,
    difficultyPatterns: DifficultyPattern[],
    optimalStudyTimes: TimeSlot[],
    masteryLevel: 'beginner' | 'intermediate' | 'advanced',
  ): string[] {
    const recommendations: string[] = [];

    if (retentionRate < 70) {
      recommendations.push(
        'Your retention rate is below 70%. Consider reviewing more frequently or using different study techniques.',
      );
    }

    if (learningVelocity < 5) {
      recommendations.push(
        'Your learning velocity is slow. Try breaking down complex topics into smaller chunks.',
      );
    }

    const strugglingTopics = difficultyPatterns.filter(
      p => p.difficultyScore > 3,
    );
    if (strugglingTopics.length > 0) {
      recommendations.push(
        `Focus more on these challenging topics: ${strugglingTopics.map(t => t.topic).join(', ')}`,
      );
    }

    if (optimalStudyTimes.length > 0) {
      const bestTime = optimalStudyTimes[0];
      recommendations.push(
        `Your best performance is at ${bestTime.hour}:00. Schedule more reviews during this time.`,
      );
    }

    if (masteryLevel === 'beginner') {
      recommendations.push(
        "You're still in the beginner phase. Focus on understanding fundamentals before moving to advanced topics.",
      );
    }

    return recommendations;
  }

  /**
   * Calculate overall mastery level from srs_items
   */
  private async calculateMasteryLevel(): Promise<
    'beginner' | 'intermediate' | 'advanced'
  > {
    try {
      const items = await this.getReviewedItems();
      if (items.length === 0) return 'beginner';

      const averageQuality =
        items.reduce((sum, i) => sum + (i.last_quality_rating ?? 0), 0) /
        items.length;
      const averageEaseFactor =
        items.reduce((sum, i) => sum + i.ease_factor, 0) / items.length;

      if (averageQuality >= 4 && averageEaseFactor >= 3.0) return 'advanced';
      if (averageQuality >= 3 && averageEaseFactor >= 2.5)
        return 'intermediate';
      return 'beginner';
    } catch (error) {
      console.error('❌ Error calculating mastery level:', error);
      return 'beginner';
    }
  }

  /**
   * Get weekly progress data from srs_items.last_reviewed_at
   */
  private async getWeeklyProgress(): Promise<WeeklyProgress[]> {
    try {
      const items = await this.getReviewedItems();
      const withTime = items.filter(i => i.last_reviewed_at !== null);
      if (withTime.length === 0) return [];

      const weekGroups = withTime.reduce(
        (groups, item) => {
          const date = new Date(item.last_reviewed_at!);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];

          if (!groups[weekKey]) groups[weekKey] = [];
          groups[weekKey].push(item);
          return groups;
        },
        {} as Record<string, SRSItemRow[]>,
      );

      const weeklyProgress: WeeklyProgress[] = [];

      for (const [week, weekItems] of Object.entries(weekGroups)) {
        const qualityScores = weekItems.map(i => i.last_quality_rating ?? 0);
        const averageQuality =
          qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length;
        const retentionRate =
          (qualityScores.filter(s => s >= 3).length / qualityScores.length) *
          100;

        weeklyProgress.push({
          week,
          reviewsCompleted: weekItems.length,
          averageQuality,
          retentionRate,
          timeSpent: 0, // No response_time_seconds equivalent in SQLite schema
        });
      }

      return weeklyProgress.sort((a, b) => a.week.localeCompare(b.week));
    } catch (error) {
      console.error('❌ Error getting weekly progress:', error);
      return [];
    }
  }

  /**
   * Get topic mastery levels from srs_items
   */
  private async getTopicMasteryLevels(): Promise<TopicMastery[]> {
    try {
      const db = await getDatabase();
      const deviceId = await getOrCreateDeviceId();

      const items = await db.getAllAsync<SRSItemRow>(
        `SELECT id, topic, ease_factor, last_quality_rating, last_reviewed_at,
                next_review_date, repetitions
         FROM srs_items
         WHERE user_id = ? AND is_active = 1 AND repetitions > 0`,
        [deviceId],
      );

      return items
        .map(item => ({
          sessionId: item.id,
          topic: item.topic,
          masteryLevel: Math.min(100, (item.ease_factor / 3.0) * 100),
          lastReviewed: item.last_reviewed_at ?? item.next_review_date,
          nextReview: item.next_review_date,
          easeFactor: item.ease_factor,
          reviewCount: item.repetitions,
        }))
        .sort((a, b) => b.masteryLevel - a.masteryLevel);
    } catch (error) {
      console.error('❌ Error getting topic mastery levels:', error);
      return [];
    }
  }

  /**
   * Get study streaks from srs_items.last_reviewed_at
   */
  private async getStudyStreaks(): Promise<StudyStreak[]> {
    try {
      const db = await getDatabase();
      const deviceId = await getOrCreateDeviceId();

      const rows = await db.getAllAsync<{ last_reviewed_at: string }>(
        `SELECT last_reviewed_at FROM srs_items
         WHERE user_id = ? AND last_reviewed_at IS NOT NULL`,
        [deviceId],
      );

      if (rows.length === 0) return [];

      const uniqueDates = [
        ...new Set(
          rows.map(r => new Date(r.last_reviewed_at).toDateString()).sort(),
        ),
      ].sort();

      const streaks: StudyStreak[] = [];
      let currentStreak: Date[] = [];

      for (let i = 0; i < uniqueDates.length; i++) {
        const currentDate = new Date(uniqueDates[i]);
        const prevDate = i > 0 ? new Date(uniqueDates[i - 1]) : null;

        if (
          prevDate &&
          currentDate.getTime() - prevDate.getTime() === 24 * 60 * 60 * 1000
        ) {
          currentStreak.push(currentDate);
        } else {
          if (currentStreak.length > 0) {
            streaks.push({
              startDate: currentStreak[0].toISOString(),
              endDate: currentStreak[currentStreak.length - 1].toISOString(),
              length: currentStreak.length,
              isActive: false,
            });
          }
          currentStreak = [currentDate];
        }
      }

      if (currentStreak.length > 0) {
        streaks.push({
          startDate: currentStreak[0].toISOString(),
          endDate: undefined,
          length: currentStreak.length,
          isActive: true,
        });
      }

      return streaks.sort((a, b) => b.length - a.length);
    } catch (error) {
      console.error('❌ Error getting study streaks:', error);
      return [];
    }
  }

  /**
   * Get upcoming SRS reviews from reminders joined with srs_items for topic
   */
  private async getUpcomingReviews(): Promise<UpcomingReview[]> {
    try {
      const db = await getDatabase();
      const deviceId = await getOrCreateDeviceId();

      const rows = await db.getAllAsync<ReminderRow>(
        `SELECT r.id, r.srs_item_id, r.scheduled_time, s.topic
         FROM reminders r
         LEFT JOIN srs_items s ON s.id = r.srs_item_id
         WHERE r.user_id = ?
           AND r.reminder_type = 'srs_review'
           AND r.is_cancelled = 0
           AND r.fired_at IS NULL
           AND r.scheduled_time >= ?
         ORDER BY r.scheduled_time ASC
         LIMIT 10`,
        [deviceId, new Date().toISOString()],
      );

      return rows.map(row => ({
        sessionId: row.srs_item_id ?? row.id,
        topic: row.topic ?? '',
        dueDate: row.scheduled_time,
        priority: 'medium' as const,
        estimatedDifficulty: 3,
      }));
    } catch (error) {
      console.error('❌ Error getting upcoming reviews:', error);
      return [];
    }
  }

  /**
   * Get overall statistics from srs_items
   */
  private async getOverallStats(): Promise<OverallStats> {
    const empty: OverallStats = {
      totalReviews: 0,
      averageQuality: 0,
      retentionRate: 0,
      topicsReviewed: 0,
      averageEaseFactor: 0,
      studyTimeTotal: 0,
      longestStreak: 0,
      currentStreak: 0,
    };

    try {
      const items = await this.getReviewedItems();
      if (items.length === 0) return empty;

      const totalReviews = items.length;
      const averageQuality =
        items.reduce((sum, i) => sum + (i.last_quality_rating ?? 0), 0) /
        totalReviews;
      const retentionRate =
        (items.filter(i => (i.last_quality_rating ?? 0) >= 3).length /
          totalReviews) *
        100;
      const topicsReviewed = new Set(items.map(i => i.topic)).size;
      const averageEaseFactor =
        items.reduce((sum, i) => sum + i.ease_factor, 0) / totalReviews;

      const streaks = await this.getStudyStreaks();
      const longestStreak =
        streaks.length > 0 ? Math.max(...streaks.map(s => s.length)) : 0;
      const currentStreak = streaks.find(s => s.isActive)?.length ?? 0;

      return {
        totalReviews,
        averageQuality,
        retentionRate,
        topicsReviewed,
        averageEaseFactor,
        studyTimeTotal: 0, // No response_time_seconds equivalent in SQLite schema
        longestStreak,
        currentStreak,
      };
    } catch (error) {
      console.error('❌ Error getting overall stats:', error);
      return empty;
    }
  }
}
