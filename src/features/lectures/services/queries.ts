import { getDatabase } from '@/services/database';
import { getOrCreateDeviceId } from '@/utils/deviceId';
import { Lecture } from '@/types';

export interface LecturesPage {
  lectures: Lecture[];
  nextOffset: number | undefined;
  hasMore: boolean;
}

export interface LectureQueryOptions {
  pageParam?: number;
  pageSize?: number;
  sortBy?: 'start_time' | 'lecture_date' | 'created_at';
  sortAscending?: boolean;
}

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

export const lecturesApi = {
  async getAll(): Promise<Lecture[]> {
    const db = await getDatabase();
    const userId = await getOrCreateDeviceId();
    const rows = await db.getAllAsync<TaskRow>(
      `SELECT id, user_id, course_id, title, description, start_time, metadata, created_at
       FROM tasks
       WHERE user_id = ? AND type = 'lecture' AND is_deleted = 0
       ORDER BY start_time ASC`,
      [userId],
    );
    return rows.map(rowToLecture);
  },

  async listPage(options?: LectureQueryOptions): Promise<LecturesPage> {
    const db = await getDatabase();
    const userId = await getOrCreateDeviceId();
    const {
      pageParam = 0,
      pageSize = 50,
      sortBy = 'start_time',
      sortAscending = true,
    } = options || {};

    // 'lecture_date' and 'start_time' both map to the start_time column
    const col = sortBy === 'created_at' ? 'created_at' : 'start_time';
    const order = sortAscending ? 'ASC' : 'DESC';

    const rows = await db.getAllAsync<TaskRow>(
      `SELECT id, user_id, course_id, title, description, start_time, metadata, created_at
       FROM tasks
       WHERE user_id = ? AND type = 'lecture' AND is_deleted = 0
       ORDER BY ${col} ${order}`,
      [userId],
    );

    const allLectures = rows.map(rowToLecture);
    const paginated = allLectures.slice(pageParam, pageParam + pageSize);
    const hasMore = pageParam + pageSize < allLectures.length;

    return {
      lectures: paginated,
      nextOffset: hasMore ? pageParam + pageSize : undefined,
      hasMore,
    };
  },
};
