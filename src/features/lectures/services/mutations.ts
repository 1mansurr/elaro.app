import { getDatabase } from '@/services/database';
import { getOrCreateDeviceId } from '@/utils/deviceId';
import { generateUUID } from '@/utils/uuid';
import { Lecture } from '@/types';
import { CreateLectureRequest, UpdateLectureRequest } from '@/types/api';

interface TaskRow {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string | null;
  description: string | null;
  start_time: string | null;
  metadata: string | null;
  created_at: string;
}

interface LectureMetadata {
  venue?: string;
  is_recurring?: boolean;
  recurring_pattern?: string;
}

function rowToLecture(row: TaskRow): Lecture {
  let meta: LectureMetadata = {};
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
    lectureDate: row.start_time ?? '',
    isRecurring: meta.is_recurring ?? false,
    recurringPattern: meta.recurring_pattern,
    lectureName: row.title ?? undefined,
    description: row.description ?? undefined,
    venue: meta.venue,
    createdAt: row.created_at,
  };
}

async function fetchTaskRow(id: string): Promise<TaskRow> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TaskRow>(
    `SELECT id, user_id, course_id, title, description, start_time, metadata, created_at
     FROM tasks WHERE id = ? AND type = 'lecture'`,
    [id],
  );
  if (!row) throw new Error(`Lecture not found: ${id}`);
  return row;
}

export const lecturesApiMutations = {
  async create(
    request: CreateLectureRequest,
    _isOnline: boolean,
    _userId: string,
  ): Promise<Lecture> {
    const db = await getDatabase();
    const userId = await getOrCreateDeviceId();
    const id = generateUUID();
    const now = new Date().toISOString();

    const meta: LectureMetadata = {};
    if (request.venue) meta.venue = request.venue;
    if (request.is_recurring !== undefined)
      meta.is_recurring = request.is_recurring;
    if (request.recurring_pattern)
      meta.recurring_pattern = request.recurring_pattern;

    await db.runAsync(
      `INSERT INTO tasks (id, user_id, type, course_id, title, description, start_time, end_time, metadata, created_at, updated_at)
       VALUES (?, ?, 'lecture', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        request.course_id || null,
        request.lecture_name,
        request.description ?? null,
        request.start_time,
        request.end_time ?? null,
        Object.keys(meta).length > 0 ? JSON.stringify(meta) : null,
        now,
        now,
      ],
    );

    return rowToLecture(await fetchTaskRow(id));
  },

  async update(
    lectureId: string,
    request: UpdateLectureRequest,
    _isOnline: boolean,
    _userId: string,
  ): Promise<Lecture> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const setParts: string[] = ['updated_at = ?'];
    const values: (string | null)[] = [now];

    if (request.lecture_name !== undefined) {
      setParts.push('title = ?');
      values.push(request.lecture_name);
    }
    if (request.description !== undefined) {
      setParts.push('description = ?');
      values.push(request.description ?? null);
    }
    if (request.start_time !== undefined) {
      setParts.push('start_time = ?');
      values.push(request.start_time ?? null);
    }
    if (request.end_time !== undefined) {
      setParts.push('end_time = ?');
      values.push(request.end_time ?? null);
    }

    // Merge is_recurring / recurring_pattern into metadata
    if (
      request.is_recurring !== undefined ||
      request.recurring_pattern !== undefined
    ) {
      const existing = await fetchTaskRow(lectureId);
      let meta: LectureMetadata = {};
      if (existing.metadata) {
        try {
          meta = JSON.parse(existing.metadata);
        } catch {
          // ignore
        }
      }
      if (request.is_recurring !== undefined)
        meta.is_recurring = request.is_recurring;
      if (request.recurring_pattern !== undefined)
        meta.recurring_pattern = request.recurring_pattern;
      setParts.push('metadata = ?');
      values.push(JSON.stringify(meta));
    }

    values.push(lectureId);
    await db.runAsync(
      `UPDATE tasks SET ${setParts.join(', ')} WHERE id = ? AND type = 'lecture'`,
      values,
    );

    return rowToLecture(await fetchTaskRow(lectureId));
  },

  async delete(lectureId: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE tasks SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND type = 'lecture'`,
      [now, now, lectureId],
    );
  },
};
