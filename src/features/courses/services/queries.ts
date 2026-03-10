import { versionedApiClient } from '@/services/VersionedApiClient';
import { Course } from '@/types';
import { handleApiError } from '@/services/api/errors';
import { supabase } from '@/services/supabase';

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
        throw new Error(
          response.message || response.error || 'Failed to fetch courses',
        );
      }

      // Map VersionedApiClient.Course to entities.Course
      let courses: Course[] = (response.data || []).map(apiCourse => ({
        id: apiCourse.id,
        courseName: apiCourse.course_name,
        courseCode: apiCourse.course_code,
        aboutCourse: apiCourse.about_course,
        userId: '', // VersionedApiClient.Course doesn't have user_id, will be set by the hook
        createdAt: apiCourse.created_at,
        updatedAt: apiCourse.updated_at,
        deletedAt: apiCourse.deleted_at,
      }));

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
        courses = courses.filter(
          course =>
            course.courseName?.toLowerCase().includes(searchLower) ||
            course.courseCode?.toLowerCase().includes(searchLower),
        );
      }

      // Apply archived filter
      if (!showArchived) {
        courses = courses.filter(course => !course.deletedAt);
      }

      // Apply sorting
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
      // Fallback to direct Supabase query if Edge Function fails
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error';

      if (
        errorMessage.includes('Function failed to start') ||
        errorMessage.includes('Edge Function returned a non-2xx') ||
        errorMessage.includes('WORKER_ERROR')
      ) {
        console.warn(
          '⚠️ [coursesApi] Edge Function failed, falling back to direct Supabase query',
        );

        try {
          // Get current user session
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.user) {
            throw new Error('No authenticated session');
          }

          // Query courses directly from Supabase
          let query = supabase
            .from('courses')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

          if (!options?.showArchived) {
            query = query.is('deleted_at', null);
          }

          const { data: coursesData, error: dbError } = await query;

          if (dbError) {
            throw dbError;
          }

          // Transform Supabase data to Course format
          let courses: Course[] = (coursesData || []).map(course => ({
            id: course.id,
            courseName: course.course_name,
            courseCode: course.course_code,
            aboutCourse: course.about_course,
            userId: course.user_id,
            createdAt: course.created_at,
            updatedAt: course.updated_at,
            deletedAt: course.deleted_at,
          }));

          // Apply search filter
          const {
            searchQuery,
            sortOption = 'name-asc',
            showArchived = false,
            pageParam = 0,
            pageSize = 20,
          } = options || {};

          if (searchQuery && searchQuery.trim() !== '') {
            const searchLower = searchQuery.trim().toLowerCase();
            courses = courses.filter(
              course =>
                course.courseName?.toLowerCase().includes(searchLower) ||
                course.courseCode?.toLowerCase().includes(searchLower),
            );
          }

          // Apply archived filter (already done in query, but double-check)
          if (!showArchived) {
            courses = courses.filter(course => !course.deletedAt);
          }

          // Apply sorting
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
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              );
              break;
            case 'date-oldest':
              courses.sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
              );
              break;
          }

          // Apply pagination
          const totalCount = courses.length;
          const paginatedCourses = courses.slice(
            pageParam,
            pageParam + pageSize,
          );
          const hasMore = pageParam + pageSize < totalCount;
          const nextOffset = hasMore ? pageParam + pageSize : undefined;

          return {
            courses: paginatedCourses,
            nextOffset,
            hasMore,
          };
        } catch (fallbackError) {
          console.error(
            '⚠️ [coursesApi] Fallback query also failed:',
            fallbackError,
          );
          // If fallback also fails, throw the original error
          throw handleApiError(error);
        }
      }

      // For other errors, use normal error handling
      throw handleApiError(error);
    }
  },
};
