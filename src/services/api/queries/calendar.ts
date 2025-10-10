import { supabase } from '../../supabase';
import { CalendarData } from '../../../types';
import { handleApiError } from '../errors';

export const calendarApi = {
  async getData(date: Date): Promise<CalendarData> {
    try {
      const { data, error } = await supabase.functions.invoke('get-calendar-data-for-week', {
        body: { date: date.toISOString() },
      });
      if (error) throw error;
      return data || {};
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
