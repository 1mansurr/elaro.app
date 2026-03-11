import { getDatabase } from '@/services/database';
import { getOrCreateDeviceId } from '@/utils/deviceId';
import { generateUUID } from '@/utils/uuid';
import { Assignment } from '@/types';
import { CreateAssignmentRequest, UpdateAssignmentRequest } from '@/types/api';

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

async function fetchTaskRow(id: string): Promise<TaskRow> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TaskRow>(
    `SELECT id, user_id, course_id, title, description, due_date, metadata, created_at
     FROM tasks WHERE id = ? AND type = 'assignment'`,
    [id],
  );
  if (!row) throw new Error(`Assignment not found: ${id}`);
  return row;
}

export const assignmentsApiMutations = {
  async create(
    request: CreateAssignmentRequest,
    _isOnline: boolean,
    _userId: string,
  ): Promise<Assignment> {
    const db = await getDatabase();
    const userId = await getOrCreateDeviceId();
    const id = generateUUID();
    const now = new Date().toISOString();

    const meta: AssignmentMetadata = {};
    if (request.submission_method) meta.submission_method = request.submission_method;
    if (request.submission_link) meta.submission_link = request.submission_link;

    await db.runAsync(
      `INSERT INTO tasks (id, user_id, type, course_id, title, description, due_date, metadata, created_at, updated_at)
       VALUES (?, ?, 'assignment', ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        request.course_id || null,
        request.title,
        request.description ?? null,
        request.due_date,
        Object.keys(meta).length > 0 ? JSON.stringify(meta) : null,
        now,
        now,
      ],
    );

    return rowToAssignment(await fetchTaskRow(id));
  },

  async update(
    assignmentId: string,
    request: UpdateAssignmentRequest,
    _isOnline: boolean,
    _userId: string,
  ): Promise<Assignment> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const setParts: string[] = ['updated_at = ?'];
    const values: (string | null)[] = [now];

    if (request.title !== undefined) {
      setParts.push('title = ?');
      values.push(request.title);
    }
    if (request.description !== undefined) {
      setParts.push('description = ?');
      values.push(request.description ?? null);
    }
    if (request.due_date !== undefined) {
      setParts.push('due_date = ?');
      values.push(request.due_date ?? null);
    }

    // Merge submission fields into metadata
    if (
      request.submission_method !== undefined ||
      request.submission_link !== undefined
    ) {
      const existing = await fetchTaskRow(assignmentId);
      let meta: AssignmentMetadata = {};
      if (existing.metadata) {
        try {
          meta = JSON.parse(existing.metadata);
        } catch {
          // ignore
        }
      }
      if (request.submission_method !== undefined) {
        meta.submission_method = request.submission_method;
      }
      if (request.submission_link !== undefined) {
        meta.submission_link = request.submission_link;
      }
      setParts.push('metadata = ?');
      values.push(JSON.stringify(meta));
    }

    values.push(assignmentId);
    await db.runAsync(
      `UPDATE tasks SET ${setParts.join(', ')} WHERE id = ? AND type = 'assignment'`,
      values,
    );

    return rowToAssignment(await fetchTaskRow(assignmentId));
  },

  async delete(assignmentId: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE tasks SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND type = 'assignment'`,
      [now, now, assignmentId],
    );
  },

  async complete(assignmentId: string): Promise<Assignment> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE tasks SET is_completed = 1, completed_at = ?, updated_at = ? WHERE id = ? AND type = 'assignment'`,
      [now, now, assignmentId],
    );
    return rowToAssignment(await fetchTaskRow(assignmentId));
  },
};
