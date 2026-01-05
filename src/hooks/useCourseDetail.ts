import { useQuery } from '@tanstack/react-query';
import { versionedApiClient } from '@/services/VersionedApiClient';
import { Course } from '@/types';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * React Query hook for fetching a single course by ID
 * @param courseId - The ID of the course to fetch
 * @returns React Query result with course data
 */
export const useCourseDetail = (courseId: string) => {
  const { user } = useAuth();

  return useQuery<Course, Error>({
    queryKey: ['courseDetail', courseId],
    queryFn: async () => {
      // Guard: Ensure courseId is valid
      if (!courseId) {
        throw new Error('Course ID is required');
      }

      try {
        const response = await versionedApiClient.getCourse(courseId);

        if (response.error) {
          throw new Error(
            response.message || response.error || 'Failed to fetch course',
          );
        }

        if (!response.data) {
          throw new Error('Course not found');
        }

        return response.data;
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
            '⚠️ [useCourseDetail] Edge Function failed, falling back to direct Supabase query',
          );

          try {
            if (!user?.id) {
              throw new Error('User not authenticated');
            }

            // Query course directly from Supabase
            const { data: courseData, error: dbError } = await supabase
              .from('courses')
              .select('*')
              .eq('id', courseId)
              .eq('user_id', user.id)
              .is('deleted_at', null)
              .single();

            if (dbError) {
              throw dbError;
            }

            if (!courseData) {
              throw new Error('Course not found');
            }

            // Transform Supabase data to Course format
            const course: Course = {
              id: courseData.id,
              courseName: courseData.course_name,
              courseCode: courseData.course_code,
              aboutCourse: courseData.about_course,
              userId: courseData.user_id,
              createdAt: courseData.created_at,
              updatedAt: courseData.updated_at,
              deletedAt: courseData.deleted_at,
            };

            return course;
          } catch (fallbackError) {
            console.error(
              '⚠️ [useCourseDetail] Fallback query also failed:',
              fallbackError,
            );
            // If fallback also fails, throw the original error
            throw error;
          }
        }

        // Re-throw other errors
        throw error;
      }
    },
    enabled: !!courseId && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
