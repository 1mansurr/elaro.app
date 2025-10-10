import { supabase } from '../../supabase';
import { Assignment } from '../../../types';
import { handleApiError } from '../errors';
import { mapDbAssignmentToAppAssignment } from '../mappers';

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
