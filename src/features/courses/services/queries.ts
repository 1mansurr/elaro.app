import { getDatabase } from '@/services/database';
import { getOrCreateDeviceId } from '@/utils/deviceId';
import { Course } from '@/types';

export type CourseSortOption =
  | 'name-asc'
  | 'name-desc'
  | 'date-newest'
  | 'date-oldest';

export interface CourseQueryOptions {
  searchQuery?: string;
  sortOption?: CourseSortOption;
  showArchived?: boolean;
  pageParam?: number;
  pageSize?: number;
}

export interface CoursesPage {
  courses: Course[];
  nextOffset: number | undefined;
  hasMore: boolean;
}

interface CourseRow {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  about_course: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToCourse(row: CourseRow): Course {
  return {
    id: row.id,
    userId: row.user_id,
    courseName: row.name,
    courseCode: row.code ?? undefined,
    aboutCourse: row.about_course ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export const coursesApi = {
  async getAll(options?: CourseQueryOptions): Promise<CoursesPage> {
    const db = await getDatabase();
    const userId = await getOrCreateDeviceId();

    const {
      searchQuery,
      sortOption = 'name-asc',
      showArchived = false,
      pageParam = 0,
      pageSize = 20,
    } = options || {};

    const rows = await db.getAllAsync<CourseRow>(
      'SELECT id, user_id, name, code, about_course, deleted_at, created_at, updated_at FROM courses WHERE user_id = ?',
      [userId],
    );

    let courses = rows.map(rowToCourse);

    if (!showArchived) {
      courses = courses.filter(c => !c.deletedAt);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      courses = courses.filter(
        c =>
          c.courseName?.toLowerCase().includes(q) ||
          c.courseCode?.toLowerCase().includes(q),
      );
    }

    switch (sortOption) {
      case 'name-asc':
        courses.sort((a, b) =>
          (a.courseName || '').localeCompare(b.courseName || ''),
        );
        break;
      case 'name-desc':
        courses.sort((a, b) =>
          (b.courseName || '').localeCompare(a.courseName || ''),
        );
        break;
      case 'date-newest':
        courses.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case 'date-oldest':
        courses.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        break;
    }

    const totalCount = courses.length;
    const paginated = courses.slice(pageParam, pageParam + pageSize);
    const hasMore = pageParam + pageSize < totalCount;

    return {
      courses: paginated,
      nextOffset: hasMore ? pageParam + pageSize : undefined,
      hasMore,
    };
  },

  async getById(id: string): Promise<Course | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<CourseRow>(
      'SELECT id, user_id, name, code, about_course, deleted_at, created_at, updated_at FROM courses WHERE id = ?',
      [id],
    );
    return row ? rowToCourse(row) : null;
  },
};
