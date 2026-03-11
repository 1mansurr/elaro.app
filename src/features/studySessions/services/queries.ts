import { getDatabase } from '@/services/database';
import { getOrCreateDeviceId } from '@/utils/deviceId';
import { StudySession } from '@/types';

export interface StudySessionsPage {
  studySessions: StudySession[];
  nextOffset: number | undefined;
  hasMore: boolean;
}

export interface StudySessionQueryOptions {
  pageParam?: number;
  pageSize?: number;
  sortBy?: 'session_date' | 'created_at';
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
  deleted_at: string | null;
  created_at: string;
}

interface StudySessionMetadata {
  has_spaced_repetition?: boolean;
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
    difficulty_rating: meta.difficulty_rating ?? null,
    confidence_level: meta.confidence_level ?? null,
    time_spent_minutes: meta.time_spent_minutes ?? null,
    last_reviewed_at: meta.last_reviewed_at ?? null,
    review_count: meta.review_count ?? 0,
    createdAt: row.created_at,
    deletedAt: row.deleted_at ?? null,
  };
}

export const studySessionsApi = {
  async getAll(): Promise<StudySession[]> {
    const db = await getDatabase();
    const userId = await getOrCreateDeviceId();
    const rows = await db.getAllAsync<TaskRow>(
      `SELECT id, user_id, course_id, title, description, due_date, metadata, deleted_at, created_at
       FROM tasks
       WHERE user_id = ? AND type = 'study_session' AND is_deleted = 0
       ORDER BY due_date ASC`,
      [userId],
    );
    return rows.map(rowToStudySession);
  },

  async listPage(
    options?: StudySessionQueryOptions,
  ): Promise<StudySessionsPage> {
    const db = await getDatabase();
    const userId = await getOrCreateDeviceId();
    const {
      pageParam = 0,
      pageSize = 50,
      sortBy = 'session_date',
      sortAscending = true,
    } = options || {};

    // 'session_date' maps to the due_date column
    const col = sortBy === 'created_at' ? 'created_at' : 'due_date';
    const order = sortAscending ? 'ASC' : 'DESC';

    const rows = await db.getAllAsync<TaskRow>(
      `SELECT id, user_id, course_id, title, description, due_date, metadata, deleted_at, created_at
       FROM tasks
       WHERE user_id = ? AND type = 'study_session' AND is_deleted = 0
       ORDER BY ${col} ${order}`,
      [userId],
    );

    const allSessions = rows.map(rowToStudySession);
    const paginated = allSessions.slice(pageParam, pageParam + pageSize);
    const hasMore = pageParam + pageSize < allSessions.length;

    return {
      studySessions: paginated,
      nextOffset: hasMore ? pageParam + pageSize : undefined,
      hasMore,
    };
  },
};
