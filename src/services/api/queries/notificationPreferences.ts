import { supabase } from '../../supabase';
import { handleApiError } from '../errors';
import { NotificationPreferences } from '../../../types';

export const notificationPreferencesApi = {
  async get(): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = 'exact one row not found'
        throw error;
      }
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
