import { supabase } from '@/services/supabase';
import { CalendarData } from '@/types';
import { handleApiError } from '../errors';
import { getFreshAccessToken } from '@/utils/getFreshAccessToken';

export const calendarApi = {
  async getData(date: Date): Promise<CalendarData> {
    try {
      const accessToken = await getFreshAccessToken();
      const { data, error } = await supabase.functions.invoke(
        'get-calendar-data-for-week',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: { date: date.toISOString() },
        },
      );
      if (error) throw error;
      return data || {};
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getMonthData(year: number, month: number): Promise<CalendarData> {
    try {
      const accessToken = await getFreshAccessToken();
      // Create date for first day of the month
      const date = new Date(year, month, 1);
      const { data, error } = await supabase.functions.invoke(
        'get-calendar-data-for-month',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: { date: date.toISOString() },
        },
      );
      if (error) throw error;
      return data || {};
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
