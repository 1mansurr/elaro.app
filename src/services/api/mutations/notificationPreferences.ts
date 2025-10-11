import { supabase } from '../../supabase';
import { handleApiError } from '../errors';
import { NotificationPreferences } from '../../../types';

export const notificationPreferencesApiMutations = {
  async update(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updates = {
        ...preferences,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
