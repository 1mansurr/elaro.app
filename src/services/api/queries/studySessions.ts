import { supabase } from '../../supabase';
import { StudySession } from '../../../types';
import { handleApiError } from '../errors';
import { mapDbStudySessionToAppStudySession } from '../mappers';

export const studySessionsApi = {
  async getAll(): Promise<StudySession[]> {
    try {
      const { data, error } = await supabase.from('study_sessions').select('*').order('session_date', { ascending: true });
      if (error) throw error;
      // Map the data before returning it
      return (data || []).map(mapDbStudySessionToAppStudySession);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
