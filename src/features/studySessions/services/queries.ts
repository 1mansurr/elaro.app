import { supabase } from '@/services/supabase';
import { StudySession } from '@/types';
import { handleApiError } from '@/services/api/errors';
import { mapDbStudySessionToAppStudySession } from '@/services/api/mappers';

export interface StudySessionsPage {
  studySessions: StudySession[];
  nextOffset: number | undefined;
  hasMore: boolean;
}

export interface StudySessionQueryOptions {
  pageParam?: number;
  pageSize?: number;
  sortBy?: 'session_date' | 'created_at';
  sortAscending?: boolean;
}

export const studySessionsApi = {
  /**
   * Get all study sessions (backward compatibility - use listPage for pagination)
   * @deprecated Consider using listPage() for better performance with large datasets
   */
  async getAll(): Promise<StudySession[]> {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .is('deleted_at', null) // Explicitly filter soft-deleted items
        .order('session_date', { ascending: true });
      if (error) throw error;
      // Map the data before returning it
      return (data || []).map(mapDbStudySessionToAppStudySession);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Get paginated study sessions with sorting options
   * @param options - Query options including pagination and sorting
   * @returns Paginated study sessions with metadata
   */
  async listPage(
    options?: StudySessionQueryOptions,
  ): Promise<StudySessionsPage> {
    try {
      const {
        pageParam = 0,
        pageSize = 50,
        sortBy = 'session_date',
        sortAscending = true,
      } = options || {};

      let query = supabase
        .from('study_sessions')
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

      const mappedData = (data || []).map(mapDbStudySessionToAppStudySession);
      const hasMore = count ? pageParam + pageSize < count : false;
      const nextOffset = hasMore ? pageParam + pageSize : undefined;

      return {
        studySessions: mappedData,
        nextOffset,
        hasMore,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
