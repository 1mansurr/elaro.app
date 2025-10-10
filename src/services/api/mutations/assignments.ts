import { supabase } from '../../supabase';
import { Assignment } from '../../../types';
import { CreateAssignmentRequest } from '../types';
import { handleApiError } from '../errors';

export const assignmentsApiMutations = {
  async create(request: CreateAssignmentRequest): Promise<Assignment> {
    try {
      const { data, error } = await supabase.functions.invoke('create-assignment', { body: request });
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
