import { supabase } from '@/services/supabase';
import { Assignment } from '@/types';
import { handleApiError } from '@/services/api/errors';
import { mapDbAssignmentToAppAssignment } from '@/services/api/mappers';

export const assignmentsApi = {
  async getAll(): Promise<Assignment[]> {
    try {
      const { data, error } = await supabase.from('assignments').select('*').order('due_date', { ascending: true });
      if (error) throw error;
      // Map the data before returning it
      return (data || []).map(mapDbAssignmentToAppAssignment);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
