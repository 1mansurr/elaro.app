import { getDatabase } from '@/services/database';
import { getOrCreateDeviceId } from '@/utils/deviceId';
import { generateUUID } from '@/utils/uuid';
import { Course, CreateCourseRequest } from '@/types';

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

async function fetchCourseRow(id: string): Promise<CourseRow> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CourseRow>(
    'SELECT id, user_id, name, code, about_course, deleted_at, created_at, updated_at FROM courses WHERE id = ?',
    [id],
  );
  if (!row) throw new Error(`Course not found: ${id}`);
  return row;
}

export const coursesApiMutations = {
  async create(data: CreateCourseRequest): Promise<Course> {
    const db = await getDatabase();
    const userId = await getOrCreateDeviceId();
    const id = generateUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      'INSERT INTO courses (id, user_id, name, code, about_course, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        userId,
        data.course_name,
        data.course_code ?? null,
        data.about_course ?? null,
        now,
        now,
      ],
    );

    return rowToCourse(await fetchCourseRow(id));
  },

  async update(
    courseId: string,
    updates: Partial<CreateCourseRequest>,
    _isOnline: boolean,
    _userId: string,
  ): Promise<Course> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const setParts: string[] = ['updated_at = ?'];
    const values: (string | null)[] = [now];

    if (updates.course_name !== undefined) {
      setParts.push('name = ?');
      values.push(updates.course_name);
    }
    if (updates.course_code !== undefined) {
      setParts.push('code = ?');
      values.push(updates.course_code ?? null);
    }
    if (updates.about_course !== undefined) {
      setParts.push('about_course = ?');
      values.push(updates.about_course ?? null);
    }

    values.push(courseId);
    await db.runAsync(
      `UPDATE courses SET ${setParts.join(', ')} WHERE id = ?`,
      values,
    );

    return rowToCourse(await fetchCourseRow(courseId));
  },

  async delete(
    courseId: string,
    _isOnline: boolean,
    _userId: string,
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE courses SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [now, now, courseId],
    );
  },

  async restore(
    courseId: string,
    _isOnline: boolean,
    _userId: string,
  ): Promise<Course> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE courses SET deleted_at = NULL, updated_at = ? WHERE id = ?',
      [now, courseId],
    );
    return rowToCourse(await fetchCourseRow(courseId));
  },
};
