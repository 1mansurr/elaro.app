import { supabase } from '@/services/supabase';
import { Course } from '@/types';
import { handleApiError } from '@/services/api/errors';
import { mapDbCourseToAppCourse } from '@/services/api/mappers';

export const coursesApi = {
  async getAll(): Promise<Course[]> {
    try {
      const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      // Map the data before returning it
      return (data || []).map(mapDbCourseToAppCourse);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
