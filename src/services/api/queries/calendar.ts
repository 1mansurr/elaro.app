import { versionedApiClient } from '@/services/VersionedApiClient';
import { CalendarData } from '@/types';
import { handleApiError } from '../errors';

export const calendarApi = {
  async getData(date: Date): Promise<CalendarData> {
    try {
      // Format date as week start (Monday)
      const weekStart = new Date(date);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);

      // Format as YYYY-MM-DD
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const response = await versionedApiClient.getCalendarData(weekStartStr);

      if (response.error) {
        throw new Error(response.message || response.error || 'Failed to get calendar data');
      }

      return (response.data as CalendarData) || {};
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getMonthData(year: number, month: number): Promise<CalendarData> {
    try {
      // Create date for first day of the month (use as week start)
      const date = new Date(year, month, 1);
      const weekStart = new Date(date);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);

      // Format as YYYY-MM-DD
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const response = await versionedApiClient.getCalendarData(weekStartStr);

      if (response.error) {
        throw new Error(response.message || response.error || 'Failed to get calendar data');
      }

      return (response.data as CalendarData) || {};
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
