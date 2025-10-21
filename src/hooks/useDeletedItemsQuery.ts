import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
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
      const [courses, assignments, lectures, studySessions] = await Promise.all([
        supabase.from('courses').select('*').not('deleted_at', 'is', null),
        supabase.from('assignments').select('*').not('deleted_at', 'is', null),
        supabase.from('lectures').select('*').not('deleted_at', 'is', null),
        supabase.from('study_sessions').select('*').not('deleted_at', 'is', null),
      ]);

      const allItems: DeletedItem[] = [
        ...(courses.data || []).map(item => ({ ...item, type: 'course' as const })),
        ...(assignments.data || []).map(item => ({ ...item, type: 'assignment' as const })),
        ...(lectures.data || []).map(item => ({ ...item, type: 'lecture' as const })),
        ...(studySessions.data || []).map(item => ({ ...item, type: 'study_session' as const })),
      ].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

      return allItems;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

