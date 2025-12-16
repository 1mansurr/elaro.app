import { versionedApiClient } from '@/services/VersionedApiClient';
import { handleApiError } from '../errors';
import { NotificationPreferences } from '@/types';

export const notificationPreferencesApiMutations = {
  async update(
    preferences: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    try {
      const response = await versionedApiClient.updateNotificationPreferences(preferences);

      if (response.error) {
        throw new Error(response.message || response.error || 'Failed to update notification preferences');
      }

      return response.data as NotificationPreferences;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
