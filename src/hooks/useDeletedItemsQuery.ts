import { useQuery } from '@tanstack/react-query';
import { versionedApiClient } from '@/services/VersionedApiClient';
import { Course, Assignment, Lecture, StudySession } from '@/types';

export type DeletedItem = (Course | Assignment | Lecture | StudySession) & {
  type: 'course' | 'assignment' | 'lecture' | 'study_session';
};

/**
 * React Query hook for fetching all deleted items
 * Combines courses, assignments, lectures, and study sessions that have been soft-deleted
 */
export const useDeletedItemsQuery = () => {
  return useQuery<DeletedItem[], Error>({
    queryKey: ['deletedItems'],
    queryFn: async () => {
      try {
        const response = await versionedApiClient.getDeletedItems();

        if (response.error) {
          // Check if it's a "function not found" or "function failed to start" error
          const isFunctionError =
            response.code === 'HTTP_404' ||
            response.message?.includes('not found') ||
            response.message?.includes('Requested function was not found') ||
            response.message?.includes('Function failed to start') ||
            response.message?.includes('Request failed');

          if (isFunctionError) {
            if (__DEV__) {
              console.warn(
                '⚠️ Deleted items edge function not available, returning empty array',
              );
            }
            // Return empty array instead of throwing - app should continue working
            return [];
          }

          throw new Error(
            response.message ||
              response.error ||
              'Failed to fetch deleted items',
          );
        }

        return (response.data || []) as unknown as DeletedItem[];
      } catch (error) {
        // If edge function doesn't exist or fails, return empty array
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (
          errorMessage.includes('Function failed to start') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('Request failed')
        ) {
          if (__DEV__) {
            console.warn(
              '⚠️ Deleted items edge function error, returning empty array:',
              errorMessage,
            );
          }
          return [];
        }

        // Re-throw other errors
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
