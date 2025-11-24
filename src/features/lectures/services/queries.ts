import { supabase } from '@/services/supabase';
import { Lecture } from '@/types';
import { handleApiError } from '@/services/api/errors';
import { mapDbLectureToAppLecture } from '@/services/api/mappers';

export interface LecturesPage {
  lectures: Lecture[];
  nextOffset: number | undefined;
  hasMore: boolean;
}

export interface LectureQueryOptions {
  pageParam?: number;
  pageSize?: number;
  sortBy?: 'start_time' | 'lecture_date' | 'created_at';
  sortAscending?: boolean;
}

export const lecturesApi = {
  /**
   * Get all lectures (backward compatibility - use listPage for pagination)
   * @deprecated Consider using listPage() for better performance with large datasets
   */
  async getAll(): Promise<Lecture[]> {
    try {
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .is('deleted_at', null) // Explicitly filter soft-deleted items
        .order('start_time', { ascending: true });
      if (error) throw error;
      // Map the data before returning it
      return (data || []).map(mapDbLectureToAppLecture);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Get paginated lectures with sorting options
   * @param options - Query options including pagination and sorting
   * @returns Paginated lectures with metadata
   */
  async listPage(options?: LectureQueryOptions): Promise<LecturesPage> {
    try {
      const {
        pageParam = 0,
        pageSize = 50,
        sortBy = 'start_time',
        sortAscending = true,
      } = options || {};

      let query = supabase
        .from('lectures')
        .select('*', { count: 'exact' })
        .is('deleted_at', null); // Explicitly filter soft-deleted items

      // Apply sorting
      query = query.order(sortBy, { ascending: sortAscending });

      // Apply pagination
      const from = pageParam;
      const to = pageParam + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const mappedData = (data || []).map(mapDbLectureToAppLecture);
      const hasMore = count ? pageParam + pageSize < count : false;
      const nextOffset = hasMore ? pageParam + pageSize : undefined;

      return {
        lectures: mappedData,
        nextOffset,
        hasMore,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
