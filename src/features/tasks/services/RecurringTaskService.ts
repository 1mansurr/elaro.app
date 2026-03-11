import { getDatabase } from '@/services/database';
import { getOrCreateDeviceId } from '@/utils/deviceId';
import { generateUUID } from '@/utils/uuid';

// ─────────────────────────────────────────────────────────────
// Public interfaces (kept compatible with useRecurringTasks.ts)
// ─────────────────────────────────────────────────────────────

export interface RecurringPattern {
  id: string;
  userId: string;
  taskId: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  intervalValue: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: string;
  maxOccurrences?: number;
  lastGenerated?: string;
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
  templateData: Record<string, unknown>;
  startDate?: string;
}

export interface CreatePatternRequest {
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  intervalValue: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: string;
  maxOccurrences?: number;
  timezone?: string; // accepted for API compat, not persisted
}

// ─────────────────────────────────────────────────────────────
// Internal row types
// ─────────────────────────────────────────────────────────────

interface PatternRow {
  id: string;
  user_id: string;
  task_id: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  interval_value: number;
  days_of_week: string | null; // JSON-encoded number[]
  day_of_month: number | null;
  end_date: string | null;
  max_occurrences: number | null;
  last_generated: string | null;
  created_at: string;
  updated_at: string;
}

interface TaskRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string | null;
  course_id: string | null;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_completed: number;
  completed_at: string | null;
  metadata: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function rowToPattern(row: PatternRow): RecurringPattern {
  let daysOfWeek: number[] | undefined;
  if (row.days_of_week) {
    try {
      daysOfWeek = JSON.parse(row.days_of_week);
    } catch {
      // ignore malformed
    }
  }
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    frequency: row.frequency,
    intervalValue: row.interval_value,
    daysOfWeek,
    dayOfMonth: row.day_of_month ?? undefined,
    endDate: row.end_date ?? undefined,
    maxOccurrences: row.max_occurrences ?? undefined,
    lastGenerated: row.last_generated ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Pure JS next-date calculator — replaces all Supabase RPC date functions.
 */
function calculateNextDate(
  frequency: 'daily' | 'weekly' | 'monthly',
  intervalValue: number,
  daysOfWeek: number[] | undefined,
  dayOfMonth: number | undefined,
  fromDate: Date,
): Date {
  const next = new Date(fromDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + intervalValue);
      break;

    case 'weekly': {
      if (daysOfWeek && daysOfWeek.length > 0) {
        const sorted = [...daysOfWeek].sort((a, b) => a - b);
        const currentDay = next.getDay();
        const nextDayInWeek = sorted.find(d => d > currentDay);
        if (nextDayInWeek !== undefined) {
          next.setDate(next.getDate() + (nextDayInWeek - currentDay));
        } else {
          // Wrap to the first matching day in the next interval cycle
          next.setDate(
            next.getDate() + (7 * intervalValue - currentDay + sorted[0]),
          );
        }
      } else {
        next.setDate(next.getDate() + intervalValue * 7);
      }
      break;
    }

    case 'monthly': {
      next.setMonth(next.getMonth() + intervalValue);
      if (dayOfMonth !== undefined) {
        const maxDay = new Date(
          next.getFullYear(),
          next.getMonth() + 1,
          0,
        ).getDate();
        next.setDate(Math.min(dayOfMonth, maxDay));
      }
      break;
    }
  }

  return next;
}

// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────

export class RecurringTaskService {
  private static instance: RecurringTaskService;

  public static getInstance(): RecurringTaskService {
    if (!RecurringTaskService.instance) {
      RecurringTaskService.instance = new RecurringTaskService();
    }
    return RecurringTaskService.instance;
  }

  /**
   * Create a new recurring pattern.
   */
  async createPattern(
    request: CreatePatternRequest,
  ): Promise<RecurringPattern> {
    const db = await getDatabase();
    const userId = await getOrCreateDeviceId();
    const id = generateUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO recurring_patterns
         (id, user_id, frequency, interval_value, days_of_week, day_of_month,
          end_date, max_occurrences, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        request.frequency,
        request.intervalValue,
        request.daysOfWeek ? JSON.stringify(request.daysOfWeek) : null,
        request.dayOfMonth ?? null,
        request.endDate ?? null,
        request.maxOccurrences ?? null,
        now,
        now,
      ],
    );

    const row = await db.getFirstAsync<PatternRow>(
      'SELECT * FROM recurring_patterns WHERE id = ?',
      [id],
    );
    if (!row) throw new Error('Failed to create pattern');
    return rowToPattern(row);
  }

  /**
   * Create a recurring task: inserts the template task row and links the pattern.
   */
  async createRecurringTask(
    _userId: string,
    request: CreateRecurringTaskRequest,
  ): Promise<RecurringTask> {
    const db = await getDatabase();
    const deviceId = await getOrCreateDeviceId();
    const now = new Date().toISOString();

    const patternRow = await db.getFirstAsync<PatternRow>(
      'SELECT * FROM recurring_patterns WHERE id = ?',
      [request.patternId],
    );
    if (!patternRow) throw new Error(`Pattern not found: ${request.patternId}`);
    const pattern = rowToPattern(patternRow);

    const startDate = request.startDate ? new Date(request.startDate) : new Date();
    const templateData = request.templateData;

    // Insert the template task
    const taskId = generateUUID();
    const templateMeta = JSON.stringify({
      recurring_pattern_id: request.patternId,
      is_template: true,
    });

    await db.runAsync(
      `INSERT INTO tasks (id, user_id, type, title, description, course_id, due_date, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        deviceId,
        request.taskType,
        (templateData.title as string) || 'Recurring Task',
        (templateData.description as string) || null,
        (templateData.course_id as string) || null,
        startDate.toISOString(),
        templateMeta,
        now,
        now,
      ],
    );

    // Link pattern → task
    await db.runAsync(
      'UPDATE recurring_patterns SET task_id = ?, updated_at = ? WHERE id = ?',
      [taskId, now, request.patternId],
    );

    const nextDate = calculateNextDate(
      pattern.frequency,
      pattern.intervalValue,
      pattern.daysOfWeek,
      pattern.dayOfMonth,
      startDate,
    );

    return {
      id: request.patternId,
      userId: deviceId,
      patternId: request.patternId,
      pattern: { ...pattern, taskId },
      taskType: request.taskType,
      templateData,
      isActive: true,
      nextGenerationDate: nextDate.toISOString(),
      totalGenerated: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get all recurring tasks for the current device user.
   * Replaces the Supabase JOIN query with two SQLite reads + pure JS.
   */
  async getUserRecurringTasks(_userId: string): Promise<RecurringTask[]> {
    const db = await getDatabase();
    const deviceId = await getOrCreateDeviceId();

    const patternRows = await db.getAllAsync<PatternRow>(
      `SELECT * FROM recurring_patterns
       WHERE user_id = ? AND task_id IS NOT NULL
       ORDER BY created_at DESC`,
      [deviceId],
    );

    const results: RecurringTask[] = [];

    for (const patternRow of patternRows) {
      const pattern = rowToPattern(patternRow);

      const taskRow = await db.getFirstAsync<TaskRow>(
        `SELECT id, user_id, type, title, description, course_id, due_date,
                start_time, end_time, is_completed, completed_at, metadata, created_at
         FROM tasks WHERE id = ?`,
        [patternRow.task_id!],
      );
      if (!taskRow) continue;

      // Count tasks generated from this pattern
      const countRow = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM tasks
         WHERE metadata LIKE ? AND is_deleted = 0`,
        [`%"recurring_pattern_id":"${patternRow.id}"%`],
      );
      const totalGenerated = countRow?.count ?? 0;

      const fromDate = patternRow.last_generated
        ? new Date(patternRow.last_generated)
        : new Date();
      const nextDate = calculateNextDate(
        pattern.frequency,
        pattern.intervalValue,
        pattern.daysOfWeek,
        pattern.dayOfMonth,
        fromDate,
      );

      let taskMeta: Record<string, unknown> = {};
      if (taskRow.metadata) {
        try {
          taskMeta = JSON.parse(taskRow.metadata);
        } catch {
          // ignore
        }
      }

      results.push({
        id: patternRow.id,
        userId: deviceId,
        patternId: patternRow.id,
        pattern,
        taskType: taskRow.type as 'assignment' | 'lecture' | 'study_session',
        templateData: {
          title: taskRow.title,
          description: taskRow.description,
          course_id: taskRow.course_id,
          due_date: taskRow.due_date,
          ...taskMeta,
        },
        isActive:
          !patternRow.end_date ||
          new Date(patternRow.end_date) >= new Date(),
        nextGenerationDate: nextDate.toISOString(),
        lastGeneratedAt: patternRow.last_generated ?? undefined,
        totalGenerated,
        createdAt: patternRow.created_at,
        updatedAt: patternRow.updated_at,
      });
    }

    return results;
  }

  /**
   * Get all patterns for the current device user.
   */
  async getAvailablePatterns(): Promise<RecurringPattern[]> {
    const db = await getDatabase();
    const userId = await getOrCreateDeviceId();
    const rows = await db.getAllAsync<PatternRow>(
      'SELECT * FROM recurring_patterns WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
    );
    return rows.map(rowToPattern);
  }

  /**
   * Update a recurring task (pattern + its template task).
   */
  async updateRecurringTask(
    recurringTaskId: string,
    updates: Partial<RecurringTask>,
  ): Promise<RecurringTask> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    if (updates.templateData !== undefined) {
      const patternRow = await db.getFirstAsync<PatternRow>(
        'SELECT * FROM recurring_patterns WHERE id = ?',
        [recurringTaskId],
      );
      if (patternRow?.task_id) {
        const td = updates.templateData;
        const title = typeof td.title === 'string' ? td.title : null;
        const description =
          typeof td.description === 'string' ? td.description : null;
        await db.runAsync(
          'UPDATE tasks SET title = ?, description = ?, updated_at = ? WHERE id = ?',
          [title, description, now, patternRow.task_id],
        );
      }
    }

    await db.runAsync(
      'UPDATE recurring_patterns SET updated_at = ? WHERE id = ?',
      [now, recurringTaskId],
    );

    const all = await this.getUserRecurringTasks('');
    const updated = all.find(t => t.id === recurringTaskId);
    if (!updated)
      throw new Error(`Recurring task not found: ${recurringTaskId}`);
    return updated;
  }

  /**
   * Delete a recurring pattern (cascade deletes via FK).
   */
  async deleteRecurringTask(recurringTaskId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM recurring_patterns WHERE id = ?', [
      recurringTaskId,
    ]);
  }

  /**
   * Get tasks generated from a given recurring pattern.
   */
  async getGeneratedTasks(recurringTaskId: string): Promise<GeneratedTask[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<TaskRow>(
      `SELECT id, user_id, type, title, description, course_id, due_date,
              start_time, end_time, is_completed, completed_at, metadata, created_at
       FROM tasks
       WHERE metadata LIKE ? AND is_deleted = 0
       ORDER BY due_date DESC`,
      [`%"recurring_pattern_id":"${recurringTaskId}"%`],
    );

    return rows.map(row => ({
      id: row.id,
      recurringTaskId,
      taskId: row.id,
      taskType: row.type as 'assignment' | 'lecture' | 'study_session',
      generationDate: row.created_at,
      scheduledDate: row.due_date ?? row.start_time ?? row.created_at,
      isCompleted: row.is_completed === 1,
      completedAt: row.completed_at ?? undefined,
      createdAt: row.created_at,
    }));
  }

  /**
   * Generate the next task occurrence for a recurring pattern.
   * Pure JS: calculate next date → insert task row → update last_generated.
   */
  async generateNextTasks(recurringTaskId: string): Promise<GeneratedTask[]> {
    const db = await getDatabase();
    const deviceId = await getOrCreateDeviceId();
    const now = new Date().toISOString();

    const patternRow = await db.getFirstAsync<PatternRow>(
      'SELECT * FROM recurring_patterns WHERE id = ?',
      [recurringTaskId],
    );
    if (!patternRow) throw new Error(`Pattern not found: ${recurringTaskId}`);
    if (!patternRow.task_id)
      throw new Error('Pattern has no template task');

    const templateRow = await db.getFirstAsync<TaskRow>(
      `SELECT id, user_id, type, title, description, course_id, due_date,
              start_time, end_time, is_completed, completed_at, metadata, created_at
       FROM tasks WHERE id = ?`,
      [patternRow.task_id],
    );
    if (!templateRow) throw new Error('Template task not found');

    const pattern = rowToPattern(patternRow);
    const fromDate = patternRow.last_generated
      ? new Date(patternRow.last_generated)
      : new Date();

    const nextDate = calculateNextDate(
      pattern.frequency,
      pattern.intervalValue,
      pattern.daysOfWeek,
      pattern.dayOfMonth,
      fromDate,
    );

    // Don't generate past end date
    if (patternRow.end_date && nextDate > new Date(patternRow.end_date)) {
      return [];
    }

    // Build metadata for the new task
    let baseMeta: Record<string, unknown> = {};
    if (templateRow.metadata) {
      try {
        baseMeta = JSON.parse(templateRow.metadata);
      } catch {
        // ignore
      }
    }
    delete baseMeta.is_template;
    baseMeta.recurring_pattern_id = recurringTaskId;

    const scheduledDate = nextDate.toISOString();
    const newTaskId = generateUUID();

    await db.runAsync(
      `INSERT INTO tasks
         (id, user_id, type, course_id, title, description, due_date, start_time, end_time, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newTaskId,
        deviceId,
        templateRow.type,
        templateRow.course_id,
        templateRow.title,
        templateRow.description,
        scheduledDate,
        templateRow.type === 'lecture' ? scheduledDate : null,
        templateRow.end_time,
        JSON.stringify(baseMeta),
        now,
        now,
      ],
    );

    // Update last_generated on the pattern
    await db.runAsync(
      'UPDATE recurring_patterns SET last_generated = ?, updated_at = ? WHERE id = ?',
      [scheduledDate, now, recurringTaskId],
    );

    return [
      {
        id: newTaskId,
        recurringTaskId,
        taskId: newTaskId,
        taskType: templateRow.type as 'assignment' | 'lecture' | 'study_session',
        generationDate: now,
        scheduledDate,
        isCompleted: false,
        createdAt: now,
      },
    ];
  }

  /**
   * Process all due recurring tasks.
   * Replaces the Supabase RPC with a JS loop over patterns where last_generated < today.
   */
  async processDueRecurringTasks(): Promise<number> {
    const db = await getDatabase();
    const deviceId = await getOrCreateDeviceId();
    const today = new Date();

    const patternRows = await db.getAllAsync<PatternRow>(
      'SELECT * FROM recurring_patterns WHERE user_id = ? AND task_id IS NOT NULL',
      [deviceId],
    );

    let generated = 0;
    for (const patternRow of patternRows) {
      // Skip if past end date
      if (patternRow.end_date && new Date(patternRow.end_date) < today)
        continue;

      const fromDate = patternRow.last_generated
        ? new Date(patternRow.last_generated)
        : new Date(patternRow.created_at);

      if (fromDate < today) {
        try {
          const tasks = await this.generateNextTasks(patternRow.id);
          generated += tasks.length;
        } catch {
          // Continue with other patterns on error
        }
      }
    }

    return generated;
  }

  /**
   * Recurring task statistics — computed from SQLite, no RPC.
   */
  async getRecurringTaskStats(_userId: string): Promise<{
    totalActive: number;
    totalGenerated: number;
    upcomingGenerations: number;
    completionRate: number;
  }> {
    const db = await getDatabase();
    const deviceId = await getOrCreateDeviceId();
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const patternRows = await db.getAllAsync<PatternRow>(
      'SELECT * FROM recurring_patterns WHERE user_id = ? AND task_id IS NOT NULL',
      [deviceId],
    );

    const totalActive = patternRows.filter(
      p => !p.end_date || new Date(p.end_date) >= today,
    ).length;

    const genCountRow = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM tasks
       WHERE metadata LIKE '%"recurring_pattern_id":%' AND is_deleted = 0`,
    );
    const totalGenerated = genCountRow?.count ?? 0;

    let upcomingGenerations = 0;
    for (const patternRow of patternRows) {
      if (patternRow.end_date && new Date(patternRow.end_date) < today)
        continue;
      const pattern = rowToPattern(patternRow);
      const fromDate = patternRow.last_generated
        ? new Date(patternRow.last_generated)
        : new Date();
      const nextDate = calculateNextDate(
        pattern.frequency,
        pattern.intervalValue,
        pattern.daysOfWeek,
        pattern.dayOfMonth,
        fromDate,
      );
      if (nextDate <= nextWeek) upcomingGenerations++;
    }

    const completedRow = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM tasks
       WHERE metadata LIKE '%"recurring_pattern_id":%' AND is_deleted = 0 AND is_completed = 1`,
    );
    const completedCount = completedRow?.count ?? 0;
    const completionRate =
      totalGenerated > 0 ? (completedCount / totalGenerated) * 100 : 0;

    return { totalActive, totalGenerated, upcomingGenerations, completionRate };
  }

  /**
   * Seed common recurring patterns for the current user.
   */
  async createCommonPatterns(): Promise<void> {
    const commonPatterns: CreatePatternRequest[] = [
      { name: 'Daily Study Session', frequency: 'daily', intervalValue: 1 },
      {
        name: 'Weekly Assignment Review',
        frequency: 'weekly',
        intervalValue: 1,
        daysOfWeek: [1, 3, 5],
      },
      {
        name: 'Monthly Project Check-in',
        frequency: 'monthly',
        intervalValue: 1,
        dayOfMonth: 1,
      },
      {
        name: 'Bi-weekly Lecture Prep',
        frequency: 'weekly',
        intervalValue: 2,
        daysOfWeek: [0],
      },
    ];

    for (const pattern of commonPatterns) {
      await this.createPattern(pattern);
    }
  }
}
