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
      const response = await versionedApiClient.getDeletedItems();

      if (response.error) {
        throw new Error(
          response.message || response.error || 'Failed to fetch deleted items',
        );
      }

      return (response.data || []) as DeletedItem[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
