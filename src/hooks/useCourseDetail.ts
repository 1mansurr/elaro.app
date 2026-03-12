import { useQuery } from '@tanstack/react-query';
import { Course } from '@/types';
import { coursesApi } from '@/features/courses/services/queries';

/**
 * React Query hook for fetching a single course by ID (SQLite)
 */
export const useCourseDetail = (courseId: string) => {
  return useQuery<Course, Error>({
    queryKey: ['courseDetail', courseId],
    queryFn: async () => {
      if (!courseId) {
        throw new Error('Course ID is required');
      }
      const course = await coursesApi.getById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }
      return course;
    },
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
