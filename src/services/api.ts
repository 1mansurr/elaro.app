// Offline MVP — unified api facade backed by SQLite services
import { coursesApi } from '@/features/courses/services/queries';
import { assignmentsApi } from '@/features/assignments/services/queries';
import { lecturesApi } from '@/features/lectures/services/queries';
import { studySessionsApi } from '@/features/studySessions/services/queries';
import { assignmentsApiMutations } from '@/features/assignments/services/mutations';
import { lecturesApiMutations } from '@/features/lectures/services/mutations';
import { studySessionsApiMutations } from '@/features/studySessions/services/mutations';
import {
  getTodaysTasks,
  getUpcomingTasks,
  getTasksForDate,
  getTasksForMonth,
  getTaskTypes,
  createTaskType,
  updateTaskType,
  deleteTaskType,
  createCustomTask,
  updateCustomTask,
  HomeTaskRow,
  CalendarTaskRow,
  TaskTypeRow,
} from '@/services/database';
import {
  Task,
  HomeScreenData,
  CalendarData,
  TaskTypeDefinition,
  CustomField,
} from '@/types';

// ─── TaskTypeDefinition helpers ───────────────────────────────────────────────

function rowToTaskTypeDef(row: TaskTypeRow): TaskTypeDefinition {
  let fields: CustomField[] = [];
  try {
    fields = JSON.parse(row.fields);
  } catch {
    /* keep empty */
  }
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    color: row.color,
    icon: row.icon ?? 'ellipse-outline',
    fields,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Cache loaded task types so row mappers can resolve colors without async
let _taskTypeCache: TaskTypeDefinition[] | null = null;

async function getTaskTypeCache(): Promise<TaskTypeDefinition[]> {
  if (_taskTypeCache) return _taskTypeCache;
  const rows = await getTaskTypes();
  _taskTypeCache = rows.map(rowToTaskTypeDef);
  return _taskTypeCache;
}

function invalidateTaskTypeCache() {
  _taskTypeCache = null;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToTask(row: HomeTaskRow, taskTypes: TaskTypeDefinition[]): Task {
  const typeDef = row.task_type_id
    ? taskTypes.find(t => t.id === row.task_type_id)
    : undefined;
  return {
    id: row.id,
    type: row.type,
    name: row.title,
    title: row.title,
    date: row.due_date ?? '',
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    description: row.description ?? undefined,
    courses: { courseName: '' },
    color: typeDef?.color,
    task_type_id: row.task_type_id,
  };
}

function calendarRowToTask(
  row: CalendarTaskRow,
  taskTypes: TaskTypeDefinition[],
): Task {
  const typeDef = row.task_type_id
    ? taskTypes.find(t => t.id === row.task_type_id)
    : undefined;
  return {
    id: row.id,
    type: row.type,
    name: row.title,
    title: row.title,
    date: row.task_date ?? '',
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    description: row.description ?? undefined,
    courses: { courseName: '' },
    color: typeDef?.color,
    task_type_id: row.task_type_id,
  };
}

function rowsToCalendarData(
  rows: CalendarTaskRow[],
  taskTypes: TaskTypeDefinition[],
): CalendarData {
  const result: CalendarData = {};
  for (const row of rows) {
    const key = row.date_key ?? '';
    if (!key) continue;
    if (!result[key]) result[key] = [];
    result[key].push(calendarRowToTask(row, taskTypes));
  }
  return result;
}

// ─── API facade ───────────────────────────────────────────────────────────────

export const api = {
  courses: coursesApi,
  assignments: assignmentsApi,
  lectures: lecturesApi,
  studySessions: studySessionsApi,
  homeScreen: {
    async getData(): Promise<HomeScreenData> {
      const [todaysRows, upcomingRows, taskTypes] = await Promise.all([
        getTodaysTasks(),
        getUpcomingTasks(),
        getTaskTypeCache(),
      ]);
      return {
        todaysTasks: todaysRows.map(r => rowToTask(r, taskTypes)),
        upcomingTasks: upcomingRows.map(r => rowToTask(r, taskTypes)),
      };
    },
  },
  calendar: {
    async getData(date: Date): Promise<CalendarData> {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const [rows, taskTypes] = await Promise.all([
        getTasksForDate(`${y}-${m}-${d}`),
        getTaskTypeCache(),
      ]);
      return rowsToCalendarData(rows, taskTypes);
    },
    async getMonthData(year: number, month: number): Promise<CalendarData> {
      const [rows, taskTypes] = await Promise.all([
        getTasksForMonth(year, month),
        getTaskTypeCache(),
      ]);
      return rowsToCalendarData(rows, taskTypes);
    },
  },
  taskTypes: {
    async getAll(): Promise<TaskTypeDefinition[]> {
      const rows = await getTaskTypes();
      _taskTypeCache = rows.map(rowToTaskTypeDef);
      return _taskTypeCache;
    },
    async create(data: {
      id: string;
      user_id: string;
      name: string;
      color: string;
      icon: string;
      fields: CustomField[];
    }): Promise<TaskTypeDefinition> {
      const row = await createTaskType({
        ...data,
        fields: JSON.stringify(data.fields),
      });
      invalidateTaskTypeCache();
      return rowToTaskTypeDef(row);
    },
    async update(
      id: string,
      data: {
        name?: string;
        color?: string;
        icon?: string;
        fields?: CustomField[];
      },
    ): Promise<void> {
      await updateTaskType(id, {
        name: data.name,
        color: data.color,
        icon: data.icon,
        fields:
          data.fields !== undefined ? JSON.stringify(data.fields) : undefined,
      });
      invalidateTaskTypeCache();
    },
    async delete(id: string): Promise<void> {
      await deleteTaskType(id);
      invalidateTaskTypeCache();
    },
  },
  mutations: {
    assignments: assignmentsApiMutations,
    lectures: lecturesApiMutations,
    studySessions: studySessionsApiMutations,
    customTasks: {
      async create(data: {
        id: string;
        user_id: string;
        task_type_id: string;
        title: string;
        description: string;
        due_date: string;
        metadata: Record<string, unknown>;
      }): Promise<{ id: string }> {
        await createCustomTask({
          ...data,
          metadata: JSON.stringify(data.metadata),
        });
        return { id: data.id };
      },
      async update(
        id: string,
        data: {
          title: string;
          description: string;
          due_date: string;
          metadata: Record<string, unknown>;
        },
      ): Promise<void> {
        await updateCustomTask(id, {
          ...data,
          metadata: JSON.stringify(data.metadata),
        });
      },
    },
  },
};
