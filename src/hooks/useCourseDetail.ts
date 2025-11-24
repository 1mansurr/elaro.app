import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
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
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .is('deleted_at', null) // Only fetch active courses
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!courseId, // Only run query if courseId is provided
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
