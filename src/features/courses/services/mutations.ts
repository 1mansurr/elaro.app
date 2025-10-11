import { supabase } from '@/services/supabase';
import { handleApiError } from '@/services/api/errors';
import { Course, CreateCourseRequest } from '@/types';

export const coursesApiMutations = {
  /**
   * Create a new course
   */
  async create(request: CreateCourseRequest): Promise<Course> {
    try {
      const { data, error } = await supabase.functions.invoke('create-course', {
        body: request,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Update an existing course
   */
  async update(courseId: string, updates: Partial<CreateCourseRequest>): Promise<Course> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', courseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Delete a course (soft delete)
   */
  async delete(courseId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', courseId);

      if (error) throw error;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Restore a soft-deleted course
   */
  async restore(courseId: string): Promise<Course> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .update({ deleted_at: null })
        .eq('id', courseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
