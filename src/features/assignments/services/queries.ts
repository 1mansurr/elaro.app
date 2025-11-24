import { supabase } from '@/services/supabase';
import { Assignment } from '@/types';
import { handleApiError } from '@/services/api/errors';
import { mapDbAssignmentToAppAssignment } from '@/services/api/mappers';

export interface AssignmentsPage {
  assignments: Assignment[];
  nextOffset: number | undefined;
  hasMore: boolean;
}

export interface AssignmentQueryOptions {
  pageParam?: number;
  pageSize?: number;
  sortBy?: 'due_date' | 'created_at';
  sortAscending?: boolean;
}

export const assignmentsApi = {
  /**
   * Get all assignments (backward compatibility - use listPage for pagination)
   * @deprecated Consider using listPage() for better performance with large datasets
   */
  async getAll(): Promise<Assignment[]> {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .is('deleted_at', null) // Explicitly filter soft-deleted items
        .order('due_date', { ascending: true });
      if (error) throw error;
      // Map the data before returning it
      return (data || []).map(mapDbAssignmentToAppAssignment);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Get paginated assignments with sorting options
   * @param options - Query options including pagination and sorting
   * @returns Paginated assignments with metadata
   */
  async listPage(options?: AssignmentQueryOptions): Promise<AssignmentsPage> {
    try {
      const {
        pageParam = 0,
        pageSize = 50,
        sortBy = 'due_date',
        sortAscending = true,
      } = options || {};

      let query = supabase
        .from('assignments')
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

      // Map the data before returning it
      const mappedData = (data || []).map(mapDbAssignmentToAppAssignment);
      const hasMore = count ? pageParam + pageSize < count : false;
      const nextOffset = hasMore ? pageParam + pageSize : undefined;

      return {
        assignments: mappedData,
        nextOffset,
        hasMore,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
