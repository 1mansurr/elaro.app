import { supabase } from '@/services/supabase';
import { Course } from '@/types';
import { handleApiError } from '@/services/api/errors';
import { mapDbCourseToAppCourse } from '@/services/api/mappers';

export type CourseSortOption = 'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest';

export interface CourseQueryOptions {
  searchQuery?: string;
  sortOption?: CourseSortOption;
  showArchived?: boolean;
  pageParam?: number;
  pageSize?: number;
}

export interface CoursesPage {
  courses: Course[];
  nextOffset: number | undefined;
  hasMore: boolean;
}

export const coursesApi = {
  async getAll(options?: CourseQueryOptions): Promise<CoursesPage> {
    try {
      const { 
        searchQuery, 
        sortOption = 'name-asc', 
        showArchived = false,
        pageParam = 0,
        pageSize = 20,
      } = options || {};
      
      let query = supabase.from('courses').select('*', { count: 'exact' });
      
      // Apply search filter if searchQuery is provided
      if (searchQuery && searchQuery.trim() !== '') {
        query = query.ilike('course_name', `%${searchQuery.trim()}%`);
      }
      
      // Apply archived filter (courses with deleted_at are considered archived)
      if (!showArchived) {
        query = query.is('deleted_at', null);
      }
      
      // Apply sorting
      switch (sortOption) {
        case 'name-asc':
          query = query.order('course_name', { ascending: true });
          break;
        case 'name-desc':
          query = query.order('course_name', { ascending: false });
          break;
        case 'date-newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'date-oldest':
          query = query.order('created_at', { ascending: true });
          break;
        default:
          query = query.order('course_name', { ascending: true });
      }
      
      // Apply pagination
      const from = pageParam;
      const to = pageParam + pageSize - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Map the data before returning it
      const mappedData = (data || []).map(mapDbCourseToAppCourse);
      const hasMore = count ? (pageParam + pageSize) < count : false;
      const nextOffset = hasMore ? pageParam + pageSize : undefined;
      
      return {
        courses: mappedData,
        nextOffset,
        hasMore,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
