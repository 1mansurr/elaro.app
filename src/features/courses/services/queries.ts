import { supabase } from '@/services/supabase';
import { Course } from '@/types';
import { handleApiError } from '@/services/api/errors';
import { mapDbCourseToAppCourse } from '@/services/api/mappers';

export const coursesApi = {
  async getAll(searchQuery?: string): Promise<Course[]> {
    try {
      let query = supabase.from('courses').select('*');
      
      // Apply search filter if searchQuery is provided
      if (searchQuery && searchQuery.trim() !== '') {
        query = query.ilike('course_name', `%${searchQuery.trim()}%`);
      }
      
      const { data, error } = await query.order('created_at', { ascending: true });
      
      if (error) throw error;
      // Map the data before returning it
      return (data || []).map(mapDbCourseToAppCourse);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
