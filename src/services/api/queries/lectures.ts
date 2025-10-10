import { supabase } from '../../supabase';
import { Lecture } from '../../../types';
import { handleApiError } from '../errors';
import { mapDbLectureToAppLecture } from '../mappers';

export const lecturesApi = {
  async getAll(): Promise<Lecture[]> {
    try {
      const { data, error } = await supabase.from('lectures').select('*').order('lecture_date', { ascending: true });
      if (error) throw error;
      // Map the data before returning it
      return (data || []).map(mapDbLectureToAppLecture);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
