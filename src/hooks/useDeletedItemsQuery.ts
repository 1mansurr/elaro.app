import { useQuery } from '@tanstack/react-query';
import { Course, Assignment, Lecture, StudySession } from '@/types';

export type DeletedItem = (Course | Assignment | Lecture | StudySession) & {
  type: 'course' | 'assignment' | 'lecture' | 'study_session';
};

export const useDeletedItemsQuery = () => {
  return useQuery<DeletedItem[], Error>({
    queryKey: ['deletedItems'],
    queryFn: async () => [],
    staleTime: 1000 * 60 * 5,
  });
};
