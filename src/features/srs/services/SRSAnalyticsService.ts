import { supabase } from '@/services/supabase';

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
  async generateLearningInsights(userId: string): Promise<LearningInsights> {
    try {
      const [
        retentionRate,
        learningVelocity,
        difficultyPatterns,
        optimalStudyTimes,
        recommendations,
        masteryLevel,
      ] = await Promise.all([
        this.calculateRetentionRate(userId),
        this.calculateLearningVelocity(userId),
        this.analyzeDifficultyPatterns(userId),
        this.findOptimalStudyTimes(userId),
        this.generateRecommendations(userId),
        this.calculateMasteryLevel(userId),
      ]);

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
  async getPerformanceDashboard(userId: string): Promise<PerformanceDashboard> {
    try {
      const [
        weeklyProgress,
        topicMastery,
        studyStreaks,
        upcomingReviews,
        overallStats,
      ] = await Promise.all([
        this.getWeeklyProgress(userId),
        this.getTopicMasteryLevels(userId),
        this.getStudyStreaks(userId),
        this.getUpcomingReviews(userId),
        this.getOverallStats(userId),
      ]);

      return {
        weeklyProgress: weeklyProgress[0] || weeklyProgress,
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

  /**
   * Calculate retention rate based on performance history
   */
  private async calculateRetentionRate(userId: string): Promise<number> {
    try {
      const { data: performance, error } = await supabase
        .from('srs_performance')
        .select('quality_rating')
        .eq('user_id', userId);

      if (error || !performance || performance.length === 0) {
        return 0;
      }

      // Retention rate = percentage of reviews with quality >= 3
      const successfulReviews = performance.filter(
        p => p.quality_rating >= 3,
      ).length;
      return (successfulReviews / performance.length) * 100;
    } catch (error) {
      console.error('❌ Error calculating retention rate:', error);
      return 0;
    }
  }

  /**
   * Calculate learning velocity (rate of improvement)
   */
  private async calculateLearningVelocity(userId: string): Promise<number> {
    try {
      const { data: performance, error } = await supabase
        .from('srs_performance')
        .select('quality_rating, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error || !performance || performance.length < 2) {
        return 0;
      }

      // Calculate improvement over time using linear regression
      const n = performance.length;
      const x = performance.map((_, index) => index);
      const y = performance.map(p => p.quality_rating);

      const sumX = x.reduce((sum, val) => sum + val, 0);
      const sumY = y.reduce((sum, val) => sum + val, 0);
      const sumXY = x.reduce((sum, val, index) => sum + val * y[index], 0);
      const sumXX = x.reduce((sum, val) => sum + val * val, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

      // Return positive slope as learning velocity
      return Math.max(0, slope * 100); // Convert to percentage
    } catch (error) {
      console.error('❌ Error calculating learning velocity:', error);
      return 0;
    }
  }

  /**
   * Analyze difficulty patterns across topics
   */
  private async analyzeDifficultyPatterns(
    userId: string,
  ): Promise<DifficultyPattern[]> {
    try {
      const { data: performance, error } = await supabase
        .from('srs_performance')
        .select(
          `
          session_id,
          quality_rating,
          created_at,
          study_sessions!inner(topic)
        `,
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !performance) {
        return [];
      }

      // Group by topic
      interface PerformanceWithSession {
        session_id: string;
        quality_rating: number;
        created_at: string;
        study_sessions: { topic: string } | { topic: string }[];
      }
      const typedPerformance = performance as PerformanceWithSession[];
      const topicGroups = typedPerformance.reduce(
        (groups, p) => {
          let topic: string | undefined;
          const sessionData = p.study_sessions;
          if (Array.isArray(sessionData)) {
            topic = sessionData[0]?.topic;
          } else if (sessionData && typeof sessionData === 'object' && 'topic' in sessionData) {
            topic = sessionData.topic;
          }
          if (topic) {
            if (!groups[topic]) {
              groups[topic] = [];
            }
            groups[topic].push(p);
          }
          return groups;
        },
        {} as Record<string, PerformanceWithSession[]>,
      );

      // Analyze each topic
      const patterns: DifficultyPattern[] = [];

      for (const [topic, reviews] of Object.entries(topicGroups)) {
        if (reviews.length < 3) continue; // Need at least 3 reviews for pattern analysis

        const recentReviews = reviews.slice(0, 7); // Last 7 reviews
        const qualityScores = recentReviews.map(r => r.quality_rating);

        const difficultyScore =
          5 -
          qualityScores.reduce((sum, score) => sum + score, 0) /
            qualityScores.length;

        // Calculate trend (improvement over last 7 reviews)
        const trend = qualityScores;

        // Determine improvement direction
        let improvement: 'improving' | 'stable' | 'declining' = 'stable';
        if (trend.length >= 2) {
          const firstHalf = trend.slice(0, Math.floor(trend.length / 2));
          const secondHalf = trend.slice(Math.floor(trend.length / 2));

          const firstAvg =
            firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
          const secondAvg =
            secondHalf.reduce((sum, score) => sum + score, 0) /
            secondHalf.length;

          if (secondAvg > firstAvg + 0.5) improvement = 'improving';
          else if (secondAvg < firstAvg - 0.5) improvement = 'declining';
        }

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
   * Find optimal study times based on performance history
   */
  private async findOptimalStudyTimes(userId: string): Promise<TimeSlot[]> {
    try {
      const { data: performance, error } = await supabase
        .from('srs_performance')
        .select('quality_rating, created_at')
        .eq('user_id', userId);

      if (error || !performance) {
        return [];
      }

      // Group by hour of day
      const hourGroups = performance.reduce(
        (groups, p) => {
          const hour = new Date(p.created_at).getHours();
          if (!groups[hour]) {
            groups[hour] = { scores: [], count: 0 };
          }
          groups[hour].scores.push(p.quality_rating);
          groups[hour].count++;
          return groups;
        },
        {} as Record<number, { scores: number[]; count: number }>,
      );

      // Calculate performance for each hour
      const timeSlots: TimeSlot[] = [];

      for (const [hour, data] of Object.entries(hourGroups)) {
        if (data.count < 3) continue; // Need at least 3 reviews for reliable data

        const averagePerformance =
          data.scores.reduce((sum, score) => sum + score, 0) /
          data.scores.length;

        timeSlots.push({
          hour: parseInt(hour),
          performance: averagePerformance,
          frequency: data.count,
        });
      }

      return timeSlots
        .sort((a, b) => b.performance - a.performance)
        .slice(0, 5); // Top 5 optimal times
    } catch (error) {
      console.error('❌ Error finding optimal study times:', error);
      return [];
    }
  }

  /**
   * Generate personalized recommendations
   */
  private async generateRecommendations(userId: string): Promise<string[]> {
    try {
      const insights = await this.generateLearningInsights(userId);
      const recommendations: string[] = [];

      // Retention rate recommendations
      if (insights.retentionRate < 70) {
        recommendations.push(
          'Your retention rate is below 70%. Consider reviewing more frequently or using different study techniques.',
        );
      }

      // Learning velocity recommendations
      if (insights.learningVelocity < 5) {
        recommendations.push(
          'Your learning velocity is slow. Try breaking down complex topics into smaller chunks.',
        );
      }

      // Difficulty pattern recommendations
      const strugglingTopics = insights.difficultyPatterns.filter(
        p => p.difficultyScore > 3,
      );
      if (strugglingTopics.length > 0) {
        recommendations.push(
          `Focus more on these challenging topics: ${strugglingTopics.map(t => t.topic).join(', ')}`,
        );
      }

      // Study time recommendations
      if (insights.optimalStudyTimes.length > 0) {
        const bestTime = insights.optimalStudyTimes[0];
        recommendations.push(
          `Your best performance is at ${bestTime.hour}:00. Schedule more reviews during this time.`,
        );
      }

      // Mastery level recommendations
      if (insights.masteryLevel === 'beginner') {
        recommendations.push(
          "You're still in the beginner phase. Focus on understanding fundamentals before moving to advanced topics.",
        );
      }

      return recommendations;
    } catch (error) {
      console.error('❌ Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Calculate overall mastery level
   */
  private async calculateMasteryLevel(
    userId: string,
  ): Promise<'beginner' | 'intermediate' | 'advanced'> {
    try {
      const { data: performance, error } = await supabase
        .from('srs_performance')
        .select('quality_rating, ease_factor')
        .eq('user_id', userId);

      if (error || !performance || performance.length === 0) {
        return 'beginner';
      }

      const averageQuality =
        performance.reduce((sum, p) => sum + p.quality_rating, 0) /
        performance.length;
      const averageEaseFactor =
        performance.reduce((sum, p) => sum + p.ease_factor, 0) /
        performance.length;

      if (averageQuality >= 4 && averageEaseFactor >= 3.0) {
        return 'advanced';
      } else if (averageQuality >= 3 && averageEaseFactor >= 2.5) {
        return 'intermediate';
      } else {
        return 'beginner';
      }
    } catch (error) {
      console.error('❌ Error calculating mastery level:', error);
      return 'beginner';
    }
  }

  /**
   * Get weekly progress data
   */
  private async getWeeklyProgress(userId: string): Promise<WeeklyProgress[]> {
    try {
      const { data: performance, error } = await supabase
        .from('srs_performance')
        .select('quality_rating, created_at, response_time_seconds')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100); // Last 100 reviews

      if (error || !performance) {
        return [];
      }

      // Group by week
      interface PerformanceData {
        quality_rating: number;
        created_at: string;
        response_time_seconds?: number | null;
      }
      const typedPerformance = performance as PerformanceData[];
      const weekGroups = typedPerformance.reduce(
        (groups, p) => {
          const date = new Date(p.created_at);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];

          if (!groups[weekKey]) {
            groups[weekKey] = { reviews: [], timeSpent: 0 };
          }
          groups[weekKey].reviews.push(p);
          if (p.response_time_seconds) {
            groups[weekKey].timeSpent += p.response_time_seconds;
          }
          return groups;
        },
        {} as Record<string, { reviews: PerformanceData[]; timeSpent: number }>,
      );

      const weeklyProgress: WeeklyProgress[] = [];

      for (const [week, data] of Object.entries(weekGroups)) {
        const qualityScores = data.reviews.map(r => r.quality_rating);
        const averageQuality =
          qualityScores.reduce((sum, score) => sum + score, 0) /
          qualityScores.length;
        const retentionRate =
          (qualityScores.filter(score => score >= 3).length /
            qualityScores.length) *
          100;

        weeklyProgress.push({
          week,
          reviewsCompleted: data.reviews.length,
          averageQuality,
          retentionRate,
          timeSpent: Math.round(data.timeSpent / 60), // Convert to minutes
        });
      }

      return weeklyProgress.sort((a, b) => a.week.localeCompare(b.week));
    } catch (error) {
      console.error('❌ Error getting weekly progress:', error);
      return [];
    }
  }

  /**
   * Get topic mastery levels
   */
  private async getTopicMasteryLevels(userId: string): Promise<TopicMastery[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('study_sessions')
        .select(
          `
          id,
          topic,
          last_reviewed_at,
          review_count,
          srs_performance!inner(
            ease_factor,
            created_at
          )
        `,
        )
        .eq('user_id', userId)
        .eq('deleted_at', null);

      if (error || !sessions) {
        return [];
      }

      const topicMastery: TopicMastery[] = [];

      for (const session of sessions) {
        if (session.srs_performance.length === 0) continue;

        const latestPerformance = session.srs_performance[0];
        const masteryLevel = Math.min(
          100,
          (latestPerformance.ease_factor / 3.0) * 100,
        );

        // Calculate next review date (simplified)
        const lastReview = new Date(latestPerformance.created_at);
        const nextReview = new Date(lastReview);
        nextReview.setDate(lastReview.getDate() + 7); // Default 7 days

        topicMastery.push({
          sessionId: session.id,
          topic: session.topic,
          masteryLevel,
          lastReviewed:
            session.last_reviewed_at || latestPerformance.created_at,
          nextReview: nextReview.toISOString(),
          easeFactor: latestPerformance.ease_factor,
          reviewCount: session.review_count || 0,
        });
      }

      return topicMastery.sort((a, b) => b.masteryLevel - a.masteryLevel);
    } catch (error) {
      console.error('❌ Error getting topic mastery levels:', error);
      return [];
    }
  }

  /**
   * Get study streaks
   */
  private async getStudyStreaks(userId: string): Promise<StudyStreak[]> {
    try {
      const { data: performance, error } = await supabase
        .from('srs_performance')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !performance) {
        return [];
      }

      // Group consecutive days
      const streaks: StudyStreak[] = [];
      let currentStreak: Date[] = [];

      const sortedDates = performance
        .map(p => new Date(p.created_at).toDateString())
        .sort();
      const uniqueDates = [...new Set(sortedDates)].sort();

      for (let i = 0; i < uniqueDates.length; i++) {
        const currentDate = new Date(uniqueDates[i]);
        const prevDate = i > 0 ? new Date(uniqueDates[i - 1]) : null;

        if (
          prevDate &&
          currentDate.getTime() - prevDate.getTime() === 24 * 60 * 60 * 1000
        ) {
          // Consecutive day
          currentStreak.push(currentDate);
        } else {
          // New streak
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

      // Add current streak
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
   * Get upcoming reviews
   */
  private async getUpcomingReviews(userId: string): Promise<UpcomingReview[]> {
    try {
      const { data: reminders, error } = await supabase
        .from('reminders')
        .select(
          `
          session_id,
          reminder_time,
          priority,
          study_sessions!inner(topic)
        `,
        )
        .eq('user_id', userId)
        .eq('reminder_type', 'spaced_repetition')
        .eq('completed', false)
        .gte('reminder_time', new Date().toISOString())
        .order('reminder_time', { ascending: true })
        .limit(10);

      if (error || !reminders) {
        return [];
      }

      interface ReminderWithSession {
        session_id: string;
        reminder_time: string;
        priority: 'low' | 'medium' | 'high';
        study_sessions: { topic: string } | { topic: string }[] | null;
      }
      const typedReminders = reminders as ReminderWithSession[];
      return typedReminders.map(reminder => {
        let topic: string | undefined;
        const sessionData = reminder.study_sessions;
        if (Array.isArray(sessionData)) {
          topic = sessionData[0]?.topic;
        } else if (sessionData && typeof sessionData === 'object' && 'topic' in sessionData) {
          topic = sessionData.topic;
        }
        return {
          sessionId: reminder.session_id,
          topic: topic || '',
          dueDate: reminder.reminder_time,
          priority: reminder.priority,
          estimatedDifficulty: 3, // Default difficulty, could be calculated based on history
        };
      });
    } catch (error) {
      console.error('❌ Error getting upcoming reviews:', error);
      return [];
    }
  }

  /**
   * Get overall statistics
   */
  private async getOverallStats(userId: string): Promise<OverallStats> {
    try {
      const { data: performance, error } = await supabase
        .from('srs_performance')
        .select(
          'quality_rating, ease_factor, response_time_seconds, session_id',
        )
        .eq('user_id', userId);

      if (error || !performance) {
        return {
          totalReviews: 0,
          averageQuality: 0,
          retentionRate: 0,
          topicsReviewed: 0,
          averageEaseFactor: 0,
          studyTimeTotal: 0,
          longestStreak: 0,
          currentStreak: 0,
        };
      }

      const totalReviews = performance.length;
      const averageQuality =
        performance.reduce((sum, p) => sum + p.quality_rating, 0) /
        totalReviews;
      const retentionRate =
        (performance.filter(p => p.quality_rating >= 3).length / totalReviews) *
        100;
      const topicsReviewed = new Set(performance.map(p => p.session_id)).size;
      const averageEaseFactor =
        performance.reduce((sum, p) => sum + p.ease_factor, 0) / totalReviews;
      const studyTimeTotal =
        performance.reduce(
          (sum, p) => sum + (p.response_time_seconds || 0),
          0,
        ) / 60; // minutes

      // Get streaks
      const streaks = await this.getStudyStreaks(userId);
      const longestStreak =
        streaks.length > 0 ? Math.max(...streaks.map(s => s.length)) : 0;
      const currentStreak = streaks.find(s => s.isActive)?.length || 0;

      return {
        totalReviews,
        averageQuality,
        retentionRate,
        topicsReviewed,
        averageEaseFactor,
        studyTimeTotal,
        longestStreak,
        currentStreak,
      };
    } catch (error) {
      console.error('❌ Error getting overall stats:', error);
      return {
        totalReviews: 0,
        averageQuality: 0,
        retentionRate: 0,
        topicsReviewed: 0,
        averageEaseFactor: 0,
        studyTimeTotal: 0,
        longestStreak: 0,
        currentStreak: 0,
      };
    }
  }
}
