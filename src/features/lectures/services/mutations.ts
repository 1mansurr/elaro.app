import { supabase } from '@/services/supabase';
import { Lecture } from '@/types';
import { CreateLectureRequest } from '@/types/api';
import { handleApiError } from '@/services/api/errors';

export const lecturesApiMutations = {
  async create(request: CreateLectureRequest): Promise<Lecture> {
    try {
      const { data, error } = await supabase.functions.invoke('create-lecture', { body: request });
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
