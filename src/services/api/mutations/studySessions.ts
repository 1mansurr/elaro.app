import { supabase } from '../../supabase';
import { StudySession } from '../../../types';
import { CreateStudySessionRequest } from '../types';
import { handleApiError } from '../errors';

export const studySessionsApiMutations = {
  async create(request: CreateStudySessionRequest): Promise<StudySession> {
    try {
      const { data, error } = await supabase.functions.invoke('create-study-session', { body: request });
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
