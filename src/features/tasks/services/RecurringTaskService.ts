import { supabase } from '@/services/supabase';

// NOTE: This service uses direct Supabase queries and needs API endpoints created.
// TODO: Create API endpoints in api-v2 for recurring task operations:
//   - POST /api-v2/recurring-tasks/patterns (create pattern)
//   - GET /api-v2/recurring-tasks/patterns (list patterns)
//   - POST /api-v2/recurring-tasks (create recurring task)
//   - GET /api-v2/recurring-tasks (list recurring tasks)
//   - POST /api-v2/recurring-tasks/generate (generate tasks)

export interface RecurringPattern {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  intervalValue: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: string;
  maxOccurrences?: number;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  taskType: 'assignment' | 'lecture' | 'study_session';
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTask {
  id: string;
  userId: string;
  patternId: string;
  pattern: RecurringPattern;
  taskType: 'assignment' | 'lecture' | 'study_session';
  templateData: Record<string, unknown>;
  isActive: boolean;
  nextGenerationDate: string;
  lastGeneratedAt?: string;
  totalGenerated: number;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedTask {
  id: string;
  recurringTaskId: string;
  taskId: string;
  taskType: 'assignment' | 'lecture' | 'study_session';
  generationDate: string;
  scheduledDate: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface CreateRecurringTaskRequest {
  patternId: string;
  taskType: 'assignment' | 'lecture' | 'study_session';
  templateData: Record<string, any>;
  startDate?: string;
}

export interface CreatePatternRequest {
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  intervalValue: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: string;
  maxOccurrences?: number;
  timezone?: string;
}

export class RecurringTaskService {
  private static instance: RecurringTaskService;

  public static getInstance(): RecurringTaskService {
    if (!RecurringTaskService.instance) {
      RecurringTaskService.instance = new RecurringTaskService();
    }
    return RecurringTaskService.instance;
  }

  /**
   * Create a new recurring pattern
   */
  async createPattern(
    request: CreatePatternRequest,
  ): Promise<RecurringPattern> {
    try {
      const { data: pattern, error } = await supabase
        .from('recurring_patterns')
        .insert({
          name: request.name,
          frequency: request.frequency,
          interval_value: request.intervalValue,
          days_of_week: request.daysOfWeek,
          day_of_month: request.dayOfMonth,
          end_date: request.endDate,
          max_occurrences: request.maxOccurrences,
          timezone: request.timezone || 'UTC',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create pattern: ${error.message}`);
      }

      return this.mapPatternFromDB(pattern);
    } catch (error) {
      console.error('❌ Error creating recurring pattern:', error);
      throw error;
    }
  }

  /**
   * Create a recurring task
   */
  async createRecurringTask(
    userId: string,
    request: CreateRecurringTaskRequest,
  ): Promise<RecurringTask> {
    try {
      // Calculate next generation date
      const startDate = request.startDate
        ? new Date(request.startDate)
        : new Date();
      const nextGenerationDate = await this.calculateNextGenerationDate(
        request.patternId,
        startDate,
      );

      const { data: recurringTask, error } = await supabase
        .from('recurring_tasks')
        .insert({
          user_id: userId,
          pattern_id: request.patternId,
          task_type: request.taskType,
          template_data: request.templateData,
          next_generation_date: nextGenerationDate.toISOString(),
        })
        .select(
          `
          *,
          recurring_patterns!inner(*)
        `,
        )
        .single();

      if (error) {
        throw new Error(`Failed to create recurring task: ${error.message}`);
      }

      return this.mapRecurringTaskFromDB(recurringTask);
    } catch (error) {
      console.error('❌ Error creating recurring task:', error);
      throw error;
    }
  }

  /**
   * Get user's recurring tasks
   */
  async getUserRecurringTasks(userId: string): Promise<RecurringTask[]> {
    try {
      const { data: recurringTasks, error } = await supabase
        .from('recurring_tasks')
        .select(
          `
          *,
          recurring_patterns!inner(*)
        `,
        )
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get recurring tasks: ${error.message}`);
      }

      return (recurringTasks || []).map(task =>
        this.mapRecurringTaskFromDB(task),
      );
    } catch (error) {
      console.error('❌ Error getting user recurring tasks:', error);
      throw error;
    }
  }

  /**
   * Get available patterns (public patterns)
   */
  async getAvailablePatterns(): Promise<RecurringPattern[]> {
    try {
      const { data: patterns, error } = await supabase
        .from('recurring_patterns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get patterns: ${error.message}`);
      }

      return (patterns || []).map(pattern => this.mapPatternFromDB(pattern));
    } catch (error) {
      console.error('❌ Error getting available patterns:', error);
      throw error;
    }
  }

  /**
   * Update a recurring task
   */
  async updateRecurringTask(
    recurringTaskId: string,
    updates: Partial<RecurringTask>,
  ): Promise<RecurringTask> {
    try {
      const updateData: Record<string, unknown> = {};

      if (updates.isActive !== undefined) {
        updateData.is_active = updates.isActive;
      }

      if (updates.templateData) {
        updateData.template_data = updates.templateData;
      }

      const { data: updatedTask, error } = await supabase
        .from('recurring_tasks')
        .update(updateData)
        .eq('id', recurringTaskId)
        .select(
          `
          *,
          recurring_patterns!inner(*)
        `,
        )
        .single();

      if (error) {
        throw new Error(`Failed to update recurring task: ${error.message}`);
      }

      return this.mapRecurringTaskFromDB(updatedTask);
    } catch (error) {
      console.error('❌ Error updating recurring task:', error);
      throw error;
    }
  }

  /**
   * Delete a recurring task
   */
  async deleteRecurringTask(recurringTaskId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('recurring_tasks')
        .delete()
        .eq('id', recurringTaskId);

      if (error) {
        throw new Error(`Failed to delete recurring task: ${error.message}`);
      }
    } catch (error) {
      console.error('❌ Error deleting recurring task:', error);
      throw error;
    }
  }

  /**
   * Get generated tasks for a recurring task
   */
  async getGeneratedTasks(recurringTaskId: string): Promise<GeneratedTask[]> {
    try {
      const { data: generatedTasks, error } = await supabase
        .from('generated_tasks')
        .select('*')
        .eq('recurring_task_id', recurringTaskId)
        .order('scheduled_date', { ascending: false });

      if (error) {
        throw new Error(`Failed to get generated tasks: ${error.message}`);
      }

      return (generatedTasks || []).map(task =>
        this.mapGeneratedTaskFromDB(task),
      );
    } catch (error) {
      console.error('❌ Error getting generated tasks:', error);
      throw error;
    }
  }

  /**
   * Manually trigger task generation for a recurring task
   */
  async generateNextTasks(recurringTaskId: string): Promise<GeneratedTask[]> {
    try {
      const { data: result, error } = await supabase.rpc(
        'generate_tasks_from_pattern',
        {
          p_recurring_task_id: recurringTaskId,
        },
      );

      if (error) {
        throw new Error(`Failed to generate tasks: ${error.message}`);
      }

      // Get the newly generated tasks
      return await this.getGeneratedTasks(recurringTaskId);
    } catch (error) {
      console.error('❌ Error generating next tasks:', error);
      throw error;
    }
  }

  /**
   * Process all due recurring tasks (for cron jobs)
   */
  async processDueRecurringTasks(): Promise<number> {
    try {
      const { data: generatedCount, error } = await supabase.rpc(
        'process_due_recurring_tasks',
      );

      if (error) {
        throw new Error(
          `Failed to process due recurring tasks: ${error.message}`,
        );
      }

      return generatedCount || 0;
    } catch (error) {
      console.error('❌ Error processing due recurring tasks:', error);
      throw error;
    }
  }

  /**
   * Calculate next generation date for a pattern
   */
  private async calculateNextGenerationDate(
    patternId: string,
    currentDate: Date,
  ): Promise<Date> {
    try {
      const { data: nextDate, error } = await supabase.rpc(
        'calculate_next_generation_date',
        {
          p_pattern_id: patternId,
          p_current_date: currentDate.toISOString(),
        },
      );

      if (error || !nextDate) {
        // Fallback: add 1 day
        return new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }

      return new Date(nextDate);
    } catch (error) {
      console.error('❌ Error calculating next generation date:', error);
      // Fallback: add 1 day
      return new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Map database pattern to RecurringPattern interface
   */
  private mapPatternFromDB(
    dbPattern: Record<string, unknown>,
  ): RecurringPattern {
    return {
      id: dbPattern.id as string,
      name: dbPattern.name as string,
      frequency: dbPattern.frequency as 'daily' | 'weekly' | 'monthly' | 'custom',
      intervalValue: dbPattern.interval_value as number,
      daysOfWeek: dbPattern.days_of_week as number[] | undefined,
      dayOfMonth: dbPattern.day_of_month as number | undefined,
      endDate: dbPattern.end_date as string | undefined,
      maxOccurrences: dbPattern.max_occurrences as number | undefined,
      timezone: dbPattern.timezone as string,
      createdAt: dbPattern.created_at as string,
      updatedAt: dbPattern.updated_at as string,
    };
  }

  /**
   * Map database recurring task to RecurringTask interface
   */
  private mapRecurringTaskFromDB(
    dbTask: Record<string, unknown>,
  ): RecurringTask {
    return {
      id: dbTask.id as string,
      userId: dbTask.user_id as string,
      patternId: dbTask.pattern_id as string,
      pattern: this.mapPatternFromDB(dbTask.recurring_patterns as Record<string, unknown>),
      taskType: dbTask.task_type as 'assignment' | 'lecture' | 'study_session',
      templateData: dbTask.template_data as Record<string, unknown>,
      isActive: (dbTask.is_active ?? false) as boolean,
      nextGenerationDate: dbTask.next_generation_date as string,
      lastGeneratedAt: dbTask.last_generated_at as string | undefined,
      totalGenerated: dbTask.total_generated as number,
      createdAt: dbTask.created_at as string,
      updatedAt: dbTask.updated_at as string,
    };
  }

  /**
   * Map database generated task to GeneratedTask interface
   */
  private mapGeneratedTaskFromDB(
    dbTask: Record<string, unknown>,
  ): GeneratedTask {
    return {
      id: dbTask.id as string,
      recurringTaskId: dbTask.recurring_task_id as string,
      taskId: dbTask.task_id as string,
      taskType: dbTask.task_type as 'assignment' | 'lecture' | 'study_session',
      generationDate: dbTask.generation_date as string,
      scheduledDate: dbTask.scheduled_date as string,
      isCompleted: (dbTask.is_completed ?? false) as boolean,
      completedAt: dbTask.completed_at as string | undefined,
      createdAt: dbTask.created_at as string,
    };
  }

  /**
   * Create common recurring patterns
   */
  async createCommonPatterns(): Promise<void> {
    try {
      const commonPatterns = [
        {
          name: 'Daily Study Session',
          frequency: 'daily' as const,
          intervalValue: 1,
          timezone: 'UTC',
        },
        {
          name: 'Weekly Assignment Review',
          frequency: 'weekly' as const,
          intervalValue: 1,
          daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
          timezone: 'UTC',
        },
        {
          name: 'Monthly Project Check-in',
          frequency: 'monthly' as const,
          intervalValue: 1,
          dayOfMonth: 1,
          timezone: 'UTC',
        },
        {
          name: 'Bi-weekly Lecture Prep',
          frequency: 'weekly' as const,
          intervalValue: 2,
          daysOfWeek: [0], // Sunday
          timezone: 'UTC',
        },
      ];

      for (const pattern of commonPatterns) {
        await this.createPattern(pattern);
      }
    } catch (error) {
      console.error('❌ Error creating common patterns:', error);
      throw error;
    }
  }

  /**
   * Get recurring task statistics
   */
  async getRecurringTaskStats(userId: string): Promise<{
    totalActive: number;
    totalGenerated: number;
    upcomingGenerations: number;
    completionRate: number;
  }> {
    try {
      const { data: stats, error } = await supabase
        .from('recurring_tasks')
        .select(
          `
          is_active,
          total_generated,
          next_generation_date,
          generated_tasks!inner(is_completed)
        `,
        )
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to get recurring task stats: ${error.message}`);
      }

      const totalActive = stats.filter(s => s.is_active).length;
      const totalGenerated = stats.reduce(
        (sum, s) => sum + s.total_generated,
        0,
      );
      const upcomingGenerations = stats.filter(
        s =>
          s.is_active &&
          new Date(s.next_generation_date) <=
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ).length;

      const completedTasks = stats.reduce((sum, s) => {
        // Defensive check: ensure generated_tasks is an array before filtering
        if (!Array.isArray(s.generated_tasks)) return sum;
        return (
          sum +
          s.generated_tasks.filter(
            (gt: { is_completed?: boolean }) => gt.is_completed,
          ).length
        );
      }, 0);
      const completionRate =
        totalGenerated > 0 ? (completedTasks / totalGenerated) * 100 : 0;

      return {
        totalActive,
        totalGenerated,
        upcomingGenerations,
        completionRate,
      };
    } catch (error) {
      console.error('❌ Error getting recurring task stats:', error);
      throw error;
    }
  }
}
