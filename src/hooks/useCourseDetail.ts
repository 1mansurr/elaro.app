import { useQuery } from '@tanstack/react-query';
import { versionedApiClient } from '@/services/VersionedApiClient';
import { Course } from '@/types';

/**
 * React Query hook for fetching a single course by ID
 * @param courseId - The ID of the course to fetch
 * @returns React Query result with course data
 */
export const useCourseDetail = (courseId: string) => {
  return useQuery<Course, Error>({
    queryKey: ['courseDetail', courseId],
    queryFn: async () => {
      const response = await versionedApiClient.getCourse(courseId);

      if (response.error) {
        throw new Error(response.message || response.error || 'Failed to fetch course');
      }

      if (!response.data) {
        throw new Error('Course not found');
      }

      return response.data;
    },
    enabled: !!courseId, // Only run query if courseId is provided
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
