import { supabase } from '@/services/supabase';
import { AppError } from '@/utils/AppError';
import { StudySessionData, TaskData } from '@/types/service-responses';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  report_data: WeeklyReportData;
  status: 'generating' | 'completed' | 'failed';
  generated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReportData {
  academic_performance: {
    total_study_time: number;
    completed_tasks: number;
    average_session_duration: number;
    subject_breakdown: SubjectBreakdown[];
    completion_rates: CompletionRates;
  };
  time_management: {
    daily_activity: DailyActivity[];
    peak_study_hours: string[];
    productivity_score: number;
    focus_sessions: number;
  };
  progress_tracking: {
    weekly_goals_achieved: number;
    improvement_areas: string[];
    achievements: Achievement[];
    next_week_recommendations: string[];
  };
  summary: {
    key_highlights: string[];
    areas_for_improvement: string[];
    motivational_message: string;
  };
}

export interface SubjectBreakdown {
  subject: string;
  time_spent: number;
  tasks_completed: number;
  average_score?: number;
}

export interface CompletionRates {
  assignments: number;
  lectures: number;
  study_sessions: number;
  overall: number;
}

export interface DailyActivity {
  date: string;
  study_time: number;
  tasks_completed: number;
  focus_score: number;
}

export interface Achievement {
  type: 'streak' | 'milestone' | 'improvement';
  title: string;
  description: string;
  earned_at: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  category:
    | 'academic_performance'
    | 'time_management'
    | 'progress_tracking'
    | 'summary';
  template_content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// WEEKLY ANALYTICS SERVICE
// ============================================================================

export class WeeklyAnalyticsService {
  private static instance: WeeklyAnalyticsService;
  private static readonly CACHE_KEY = 'weekly_analytics_cache';
  private static readonly CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

  public static getInstance(): WeeklyAnalyticsService {
    if (!WeeklyAnalyticsService.instance) {
      WeeklyAnalyticsService.instance = new WeeklyAnalyticsService();
    }
    return WeeklyAnalyticsService.instance;
  }

  // ============================================================================
  // DATA COLLECTION METHODS
  // ============================================================================

  /**
   * Collect academic performance data for a user
   */
  async collectAcademicPerformanceData(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<WeeklyReportData['academic_performance']> {
    try {
      // Get study sessions data
      const { data: studySessions, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());

      if (sessionsError) {
        throw new AppError(
          `Failed to collect study sessions: ${sessionsError.message}`,
          500,
          'DATA_COLLECTION_ERROR',
          { userId, weekStart, weekEnd },
        );
      }

      // Get tasks data
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());

      if (tasksError) {
        throw new AppError(
          `Failed to collect tasks: ${tasksError.message}`,
          500,
          'DATA_COLLECTION_ERROR',
          { userId, weekStart, weekEnd },
        );
      }

      // Calculate metrics
      const totalStudyTime =
        studySessions?.reduce(
          (sum, session) => sum + (session.duration || 0),
          0,
        ) || 0;
      const completedTasks =
        tasks?.filter(task => task.status === 'completed').length || 0;
      const averageSessionDuration = studySessions?.length
        ? totalStudyTime / studySessions.length
        : 0;

      // Subject breakdown
      const subjectBreakdown = this.calculateSubjectBreakdown(
        studySessions || [],
        tasks || [],
      );

      // Completion rates
      const completionRates = this.calculateCompletionRates(tasks || []);

      return {
        total_study_time: totalStudyTime,
        completed_tasks: completedTasks,
        average_session_duration: averageSessionDuration,
        subject_breakdown: subjectBreakdown,
        completion_rates: completionRates,
      };
    } catch (error) {
      throw new AppError(
        `Error collecting academic performance data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'DATA_COLLECTION_ERROR',
        { userId, weekStart, weekEnd },
      );
    }
  }

  /**
   * Collect time management data for a user
   */
  async collectTimeManagementData(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<WeeklyReportData['time_management']> {
    try {
      // Get daily activity data
      const dailyActivity = await this.getDailyActivity(
        userId,
        weekStart,
        weekEnd,
      );

      // Calculate peak study hours
      const peakStudyHours = await this.getPeakStudyHours(
        userId,
        weekStart,
        weekEnd,
      );

      // Calculate productivity score
      const productivityScore = this.calculateProductivityScore(dailyActivity);

      // Count focus sessions
      const focusSessions = await this.getFocusSessionsCount(
        userId,
        weekStart,
        weekEnd,
      );

      return {
        daily_activity: dailyActivity,
        peak_study_hours: peakStudyHours,
        productivity_score: productivityScore,
        focus_sessions: focusSessions,
      };
    } catch (error) {
      throw new AppError(
        `Error collecting time management data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'DATA_COLLECTION_ERROR',
        { userId, weekStart, weekEnd },
      );
    }
  }

  /**
   * Collect progress tracking data for a user
   */
  async collectProgressTrackingData(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<WeeklyReportData['progress_tracking']> {
    try {
      // Get weekly goals
      const weeklyGoalsAchieved = await this.getWeeklyGoalsAchieved(
        userId,
        weekStart,
        weekEnd,
      );

      // Identify improvement areas
      const improvementAreas = await this.identifyImprovementAreas(
        userId,
        weekStart,
        weekEnd,
      );

      // Get achievements
      const achievements = await this.getWeeklyAchievements(
        userId,
        weekStart,
        weekEnd,
      );

      // Generate recommendations
      const nextWeekRecommendations =
        await this.generateNextWeekRecommendations(userId, weekStart, weekEnd);

      return {
        weekly_goals_achieved: weeklyGoalsAchieved,
        improvement_areas: improvementAreas,
        achievements: achievements,
        next_week_recommendations: nextWeekRecommendations,
      };
    } catch (error) {
      throw new AppError(
        `Error collecting progress tracking data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'DATA_COLLECTION_ERROR',
        { userId, weekStart, weekEnd },
      );
    }
  }

  // ============================================================================
  // REPORT GENERATION METHODS
  // ============================================================================

  /**
   * Generate a complete weekly report for a user
   */
  async generateWeeklyReport(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<WeeklyReport> {
    try {
      // Check if report already exists
      const existingReport = await this.getExistingReport(userId, weekStart);
      if (existingReport) {
        return existingReport;
      }

      // Create report record
      const { data: report, error: createError } = await supabase
        .from('weekly_reports')
        .insert({
          user_id: userId,
          week_start_date: weekStart.toISOString().split('T')[0],
          week_end_date: weekEnd.toISOString().split('T')[0],
          status: 'generating',
          report_data: {},
        })
        .select()
        .single();

      if (createError) {
        throw new AppError(
          `Failed to create report: ${createError.message}`,
          500,
          'REPORT_CREATION_ERROR',
          { userId, weekStart, weekEnd },
        );
      }

      try {
        // Collect all data
        const academicPerformance = await this.collectAcademicPerformanceData(
          userId,
          weekStart,
          weekEnd,
        );
        const timeManagement = await this.collectTimeManagementData(
          userId,
          weekStart,
          weekEnd,
        );
        const progressTracking = await this.collectProgressTrackingData(
          userId,
          weekStart,
          weekEnd,
        );

        // Generate summary
        const summary = await this.generateSummary(
          academicPerformance,
          timeManagement,
          progressTracking,
        );

        // Update report with data
        const reportData: WeeklyReportData = {
          academic_performance: academicPerformance,
          time_management: timeManagement,
          progress_tracking: progressTracking,
          summary: summary,
        };

        const { error: updateError } = await supabase
          .from('weekly_reports')
          .update({
            report_data: reportData,
            status: 'completed',
            generated_at: new Date().toISOString(),
          })
          .eq('id', report.id);

        if (updateError) {
          throw new AppError(
            `Failed to update report: ${updateError.message}`,
            500,
            'REPORT_UPDATE_ERROR',
            { reportId: report.id },
          );
        }

        return {
          ...report,
          report_data: reportData,
          status: 'completed',
          generated_at: new Date().toISOString(),
        };
      } catch (error) {
        // Mark report as failed
        await supabase
          .from('weekly_reports')
          .update({ status: 'failed' })
          .eq('id', report.id);

        throw error;
      }
    } catch (error) {
      throw new AppError(
        `Error generating weekly report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'REPORT_GENERATION_ERROR',
        { userId, weekStart, weekEnd },
      );
    }
  }

  /**
   * Get user's weekly reports
   */
  async getUserReports(
    userId: string,
    limit: number = 10,
  ): Promise<WeeklyReport[]> {
    try {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('week_start_date', { ascending: false })
        .limit(limit);

      if (error) {
        throw new AppError(
          `Failed to get user reports: ${error.message}`,
          500,
          'REPORT_FETCH_ERROR',
          { userId },
        );
      }

      return data || [];
    } catch (error) {
      throw new AppError(
        `Error getting user reports: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'REPORT_FETCH_ERROR',
        { userId },
      );
    }
  }

  /**
   * Get latest report for a user
   */
  async getLatestReport(userId: string): Promise<WeeklyReport | null> {
    try {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('week_start_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new AppError(
          `Failed to get latest report: ${error.message}`,
          500,
          'LATEST_REPORT_ERROR',
          { userId },
        );
      }

      return data || null;
    } catch (error) {
      throw new AppError(
        `Error getting latest report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'LATEST_REPORT_ERROR',
        { userId },
      );
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateSubjectBreakdown(
    sessions: StudySessionData[],
    tasks: TaskData[],
  ): SubjectBreakdown[] {
    // Defensive check: ensure both are arrays
    const sessionsArray = Array.isArray(sessions) ? sessions : [];
    const tasksArray = Array.isArray(tasks) ? tasks : [];

    const subjectMap = new Map<string, { time: number; tasks: number }>();

    // Process sessions
    sessionsArray.forEach(session => {
      const subject = session.subject || 'General';
      const current = subjectMap.get(subject) || { time: 0, tasks: 0 };
      subjectMap.set(subject, {
        time: current.time + (session.duration || 0),
        tasks: current.tasks,
      });
    });

    // Process tasks
    tasksArray.forEach(task => {
      const subject = task.subject || 'General';
      const current = subjectMap.get(subject) || { time: 0, tasks: 0 };
      subjectMap.set(subject, {
        time: current.time,
        tasks: current.tasks + (task.status === 'completed' ? 1 : 0),
      });
    });

    return Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      time_spent: data.time,
      tasks_completed: data.tasks,
      average_score: undefined,
    }));
  }

  private calculateCompletionRates(tasks: TaskData[]): CompletionRates {
    // Defensive check: ensure tasks is always an array
    const tasksArray = Array.isArray(tasks) ? tasks : [];

    const total = tasksArray.length;
    const completed = tasksArray.filter(
      task => task.status === 'completed',
    ).length;

    const assignments = tasksArray.filter(task => task.type === 'assignment');
    const lectures = tasksArray.filter(task => task.type === 'lecture');
    const studySessions = tasksArray.filter(
      task => task.type === 'study_session',
    );

    return {
      assignments: assignments.length
        ? assignments.filter(t => t.status === 'completed').length /
          assignments.length
        : 0,
      lectures: lectures.length
        ? lectures.filter(t => t.status === 'completed').length /
          lectures.length
        : 0,
      study_sessions: studySessions.length
        ? studySessions.filter(t => t.status === 'completed').length /
          studySessions.length
        : 0,
      overall: total ? completed / total : 0,
    };
  }

  private async getDailyActivity(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<DailyActivity[]> {
    const activities: DailyActivity[] = [];
    const currentDate = new Date(weekStart);

    while (currentDate <= weekEnd) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Get study time for the day
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', userId)
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString());

      const studyTime =
        sessions?.reduce((sum, session) => sum + (session.duration || 0), 0) ||
        0;

      // Get tasks completed for the day
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('updated_at', dayStart.toISOString())
        .lte('updated_at', dayEnd.toISOString());

      const tasksCompleted = tasks?.length || 0;

      // Calculate focus score (simplified)
      const focusScore = Math.min(100, (studyTime / 60) * 10); // 10 points per hour

      activities.push({
        date: currentDate.toISOString().split('T')[0],
        study_time: studyTime,
        tasks_completed: tasksCompleted,
        focus_score: focusScore,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return activities;
  }

  private async getPeakStudyHours(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<string[]> {
    // Simplified implementation - would need more sophisticated analysis
    return ['09:00', '14:00', '19:00'];
  }

  private calculateProductivityScore(dailyActivity: DailyActivity[]): number {
    const totalStudyTime = dailyActivity.reduce(
      (sum, day) => sum + day.study_time,
      0,
    );
    const totalTasks = dailyActivity.reduce(
      (sum, day) => sum + day.tasks_completed,
      0,
    );

    // Simple scoring algorithm
    const studyScore = Math.min(50, (totalStudyTime / 60) * 2); // 2 points per hour, max 50
    const taskScore = Math.min(50, totalTasks * 5); // 5 points per task, max 50

    return Math.round(studyScore + taskScore);
  }

  private async getFocusSessionsCount(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<number> {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
      .gte('duration', 30); // Sessions longer than 30 minutes

    if (error) {
      console.error('Error getting focus sessions:', error);
      return 0;
    }

    return data?.length || 0;
  }

  private async getWeeklyGoalsAchieved(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<number> {
    // Simplified implementation
    return 3; // Placeholder
  }

  private async identifyImprovementAreas(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<string[]> {
    // Simplified implementation
    return ['Time Management', 'Focus Sessions'];
  }

  private async getWeeklyAchievements(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<Achievement[]> {
    // Simplified implementation
    return [
      {
        type: 'streak',
        title: '3-Day Study Streak',
        description: 'You studied for 3 consecutive days!',
        earned_at: weekEnd.toISOString(),
      },
    ];
  }

  private async generateNextWeekRecommendations(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<string[]> {
    // Simplified implementation
    return [
      'Try to maintain consistent study hours',
      'Focus on completing assignments early',
      'Take regular breaks during long study sessions',
    ];
  }

  private async generateSummary(
    academic: WeeklyReportData['academic_performance'],
    time: WeeklyReportData['time_management'],
    progress: WeeklyReportData['progress_tracking'],
  ): Promise<WeeklyReportData['summary']> {
    const keyHighlights: string[] = [];
    const areasForImprovement: string[] = [];

    // Generate highlights
    if (academic.total_study_time > 300) {
      // 5 hours
      keyHighlights.push(
        `Great job! You studied for ${Math.round(academic.total_study_time / 60)} hours this week.`,
      );
    }

    if (academic.completed_tasks > 5) {
      keyHighlights.push(
        `You completed ${academic.completed_tasks} tasks this week.`,
      );
    }

    if (time.productivity_score > 70) {
      keyHighlights.push(
        `Your productivity score was ${time.productivity_score}% this week.`,
      );
    }

    // Generate improvement areas
    if (academic.completion_rates.overall < 0.7) {
      areasForImprovement.push('Task completion rate could be improved');
    }

    if (time.productivity_score < 50) {
      areasForImprovement.push('Focus on maintaining consistent study habits');
    }

    return {
      key_highlights: keyHighlights,
      areas_for_improvement: areasForImprovement,
      motivational_message:
        'Keep up the great work! Every study session brings you closer to your goals.',
    };
  }

  private async getExistingReport(
    userId: string,
    weekStart: Date,
  ): Promise<WeeklyReport | null> {
    const { data, error } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', weekStart.toISOString().split('T')[0])
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking existing report:', error);
    }

    return data || null;
  }
}

// Export singleton instance
export const weeklyAnalyticsService = WeeklyAnalyticsService.getInstance();
