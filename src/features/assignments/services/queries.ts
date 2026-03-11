import { getDatabase } from '@/services/database';
import { getOrCreateDeviceId } from '@/utils/deviceId';
import { Assignment } from '@/types';

export interface AssignmentsPage {
  assignments: Assignment[];
  nextOffset: number | undefined;
  hasMore: boolean;
}

export interface AssignmentQueryOptions {
  pageParam?: number;
  pageSize?: number;
  sortBy?: 'due_date' | 'created_at';
  sortAscending?: boolean;
}

interface TaskRow {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  metadata: string | null;
  created_at: string;
}

interface AssignmentMetadata {
  submission_method?: string;
  submission_link?: string;
}

function rowToAssignment(row: TaskRow): Assignment {
  let meta: AssignmentMetadata = {};
  if (row.metadata) {
    try {
      meta = JSON.parse(row.metadata);
    } catch {
      // ignore malformed metadata
    }
  }
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id ?? '',
    title: row.title,
    description: row.description ?? undefined,
    submissionMethod: meta.submission_method,
    submissionLink: meta.submission_link,
    dueDate: row.due_date ?? '',
    createdAt: row.created_at,
  };
}

export const assignmentsApi = {
  async getAll(): Promise<Assignment[]> {
    const db = await getDatabase();
    const userId = await getOrCreateDeviceId();
    const rows = await db.getAllAsync<TaskRow>(
      `SELECT id, user_id, course_id, title, description, due_date, metadata, created_at
       FROM tasks
       WHERE user_id = ? AND type = 'assignment' AND is_deleted = 0
       ORDER BY due_date ASC`,
      [userId],
    );
    return rows.map(rowToAssignment);
  },

  async listPage(options?: AssignmentQueryOptions): Promise<AssignmentsPage> {
    const db = await getDatabase();
    const userId = await getOrCreateDeviceId();
    const {
      pageParam = 0,
      pageSize = 50,
      sortBy = 'due_date',
      sortAscending = true,
    } = options || {};

    const order = sortAscending ? 'ASC' : 'DESC';
    const col = sortBy === 'created_at' ? 'created_at' : 'due_date';

    const rows = await db.getAllAsync<TaskRow>(
      `SELECT id, user_id, course_id, title, description, due_date, metadata, created_at
       FROM tasks
       WHERE user_id = ? AND type = 'assignment' AND is_deleted = 0
       ORDER BY ${col} ${order}`,
      [userId],
    );

    const allAssignments = rows.map(rowToAssignment);
    const paginated = allAssignments.slice(pageParam, pageParam + pageSize);
    const hasMore = pageParam + pageSize < allAssignments.length;

    return {
      assignments: paginated,
      nextOffset: hasMore ? pageParam + pageSize : undefined,
      hasMore,
    };
  },
};
