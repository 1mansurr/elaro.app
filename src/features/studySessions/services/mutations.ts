import { getDatabase } from '@/services/database';
import { getOrCreateDeviceId } from '@/utils/deviceId';
import { generateUUID } from '@/utils/uuid';
import { StudySession, RecurringReminder } from '@/types';
import {
  CreateStudySessionRequest,
  UpdateStudySessionRequest,
} from '@/types/api';

interface TaskRow {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  metadata: string | null;
  deleted_at: string | null;
  created_at: string;
}

interface StudySessionMetadata {
  has_spaced_repetition?: boolean;
  recurring_reminder?: RecurringReminder | null;
  recurring_reminder_end_date?: string | null;
  difficulty_rating?: number | null;
  confidence_level?: number | null;
  time_spent_minutes?: number | null;
  last_reviewed_at?: string | null;
  review_count?: number;
}

function rowToStudySession(row: TaskRow): StudySession {
  let meta: StudySessionMetadata = {};
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
    topic: row.title,
    description: row.description ?? undefined,
    sessionDate: row.due_date ?? '',
    hasSpacedRepetition: meta.has_spaced_repetition ?? false,
    recurringReminder: meta.recurring_reminder ?? null,
    recurringReminderEndDate: meta.recurring_reminder_end_date ?? null,
    difficulty_rating: meta.difficulty_rating ?? null,
    confidence_level: meta.confidence_level ?? null,
    time_spent_minutes: meta.time_spent_minutes ?? null,
    last_reviewed_at: meta.last_reviewed_at ?? null,
    review_count: meta.review_count ?? 0,
    createdAt: row.created_at,
    deletedAt: row.deleted_at ?? null,
  };
}

async function fetchTaskRow(id: string): Promise<TaskRow> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TaskRow>(
    `SELECT id, user_id, course_id, title, description, due_date, metadata, deleted_at, created_at
     FROM tasks WHERE id = ? AND type = 'study_session'`,
    [id],
  );
  if (!row) throw new Error(`Study session not found: ${id}`);
  return row;
}

export const studySessionsApiMutations = {
  async create(
    request: CreateStudySessionRequest,
    _isOnline: boolean,
    _userId: string,
  ): Promise<StudySession> {
    const db = await getDatabase();
    const userId = await getOrCreateDeviceId();
    const id = generateUUID();
    const now = new Date().toISOString();

    const meta: StudySessionMetadata = {
      has_spaced_repetition: request.has_spaced_repetition,
      recurring_reminder: request.recurring_reminder ?? null,
      recurring_reminder_end_date: request.recurring_reminder_end_date ?? null,
    };

    await db.runAsync(
      `INSERT INTO tasks (id, user_id, type, course_id, title, description, due_date, metadata, created_at, updated_at)
       VALUES (?, ?, 'study_session', ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        null,
        request.topic,
        request.notes ?? null,
        request.session_date,
        JSON.stringify(meta),
        now,
        now,
      ],
    );

    return rowToStudySession(await fetchTaskRow(id));
  },

  async update(
    sessionId: string,
    request: UpdateStudySessionRequest,
    _isOnline: boolean,
    _userId: string,
  ): Promise<StudySession> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const setParts: string[] = ['updated_at = ?'];
    const values: (string | null)[] = [now];

    if (request.topic !== undefined) {
      setParts.push('title = ?');
      values.push(request.topic);
    }
    if (request.notes !== undefined) {
      setParts.push('description = ?');
      values.push(request.notes ?? null);
    }
    if (request.session_date !== undefined) {
      setParts.push('due_date = ?');
      values.push(request.session_date ?? null);
    }

    if (
      request.has_spaced_repetition !== undefined ||
      request.recurring_reminder !== undefined ||
      request.recurring_reminder_end_date !== undefined
    ) {
      const existing = await fetchTaskRow(sessionId);
      let meta: StudySessionMetadata = {};
      if (existing.metadata) {
        try {
          meta = JSON.parse(existing.metadata);
        } catch {
          // ignore
        }
      }
      if (request.has_spaced_repetition !== undefined) {
        meta.has_spaced_repetition = request.has_spaced_repetition;
      }
      if (request.recurring_reminder !== undefined) {
        meta.recurring_reminder = request.recurring_reminder;
      }
      if (request.recurring_reminder_end_date !== undefined) {
        meta.recurring_reminder_end_date = request.recurring_reminder_end_date;
      }
      setParts.push('metadata = ?');
      values.push(JSON.stringify(meta));
    }

    values.push(sessionId);
    await db.runAsync(
      `UPDATE tasks SET ${setParts.join(', ')} WHERE id = ? AND type = 'study_session'`,
      values,
    );

    return rowToStudySession(await fetchTaskRow(sessionId));
  },

  async delete(sessionId: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE tasks SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND type = 'study_session'`,
      [now, now, sessionId],
    );
  },

  async complete(
    sessionId: string,
    updates?: Partial<StudySessionMetadata>,
  ): Promise<StudySession> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const existing = await fetchTaskRow(sessionId);
    let meta: StudySessionMetadata = {};
    if (existing.metadata) {
      try {
        meta = JSON.parse(existing.metadata);
      } catch {
        // ignore
      }
    }
    if (updates) Object.assign(meta, updates);

    await db.runAsync(
      `UPDATE tasks SET is_completed = 1, completed_at = ?, metadata = ?, updated_at = ? WHERE id = ? AND type = 'study_session'`,
      [now, JSON.stringify(meta), now, sessionId],
    );

    return rowToStudySession(await fetchTaskRow(sessionId));
  },
};
