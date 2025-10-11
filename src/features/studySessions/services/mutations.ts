import { supabase } from '@/services/supabase';
import { StudySession } from '@/types';
import { CreateStudySessionRequest } from '@/types/api';
import { handleApiError } from '@/services/api/errors';

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
