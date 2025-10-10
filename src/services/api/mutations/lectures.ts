import { supabase } from '../../supabase';
import { Lecture } from '../../../types';
import { CreateLectureRequest } from '../types';
import { handleApiError } from '../errors';

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
