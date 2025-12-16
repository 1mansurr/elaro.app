import { versionedApiClient } from '@/services/VersionedApiClient';
import { Course } from '@/types';
import { handleApiError } from '@/services/api/errors';

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

export const coursesApi = {
  async getAll(options?: CourseQueryOptions): Promise<CoursesPage> {
    try {
      // Use API layer to get courses
      const response = await versionedApiClient.getCourses();

      if (response.error) {
        throw new Error(response.message || response.error || 'Failed to fetch courses');
      }

      let courses = (response.data || []) as Course[];

      // Apply client-side filtering and sorting (can be moved to API later)
      const {
        searchQuery,
        sortOption = 'name-asc',
        showArchived = false,
        pageParam = 0,
        pageSize = 20,
      } = options || {};

      // Apply search filter
      if (searchQuery && searchQuery.trim() !== '') {
        const searchLower = searchQuery.trim().toLowerCase();
        courses = courses.filter(course =>
          course.courseName?.toLowerCase().includes(searchLower) ||
          course.courseCode?.toLowerCase().includes(searchLower)
        );
      }

      // Apply archived filter
      if (!showArchived) {
        courses = courses.filter(course => !course.deletedAt);
      }

      // Apply sorting
      switch (sortOption) {
        case 'name-asc':
          courses.sort((a, b) => (a.courseName || '').localeCompare(b.courseName || ''));
          break;
        case 'name-desc':
          courses.sort((a, b) => (b.courseName || '').localeCompare(a.courseName || ''));
          break;
        case 'date-newest':
          courses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'date-oldest':
          courses.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          break;
      }

      // Apply pagination
      const totalCount = courses.length;
      const paginatedCourses = courses.slice(pageParam, pageParam + pageSize);
      const hasMore = pageParam + pageSize < totalCount;
      const nextOffset = hasMore ? pageParam + pageSize : undefined;

      return {
        courses: paginatedCourses,
        nextOffset,
        hasMore,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
