import { versionedApiClient } from '@/services/VersionedApiClient';
import { handleApiError } from '../errors';
import { NotificationPreferences } from '@/types';

export const notificationPreferencesApi = {
  async get(): Promise<NotificationPreferences | null> {
    try {
      const response = await versionedApiClient.getNotificationPreferences();

      if (response.error) {
        // Not found is OK, return null
        if (response.code === 'PGRST116' || response.message?.includes('not found')) {
          return null;
        }
        throw new Error(response.message || response.error || 'Failed to get notification preferences');
      }

      return response.data as NotificationPreferences | null;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
