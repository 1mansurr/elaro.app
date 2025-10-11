import { supabase } from '@/services/supabase';
import { Assignment } from '@/types';
import { CreateAssignmentRequest } from '@/types/api';
import { handleApiError } from '@/services/api/errors';

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
