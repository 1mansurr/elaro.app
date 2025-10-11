import { supabase } from '@/services/supabase';
import { Lecture } from '@/types';
import { handleApiError } from '@/services/api/errors';
import { mapDbLectureToAppLecture } from '@/services/api/mappers';

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
