import { versionedApiClient } from '@/services/VersionedApiClient';
import { HomeScreenData } from '@/types';
import { handleApiError } from '../errors';

export const homeScreenApi = {
  async getData(): Promise<HomeScreenData | null> {
    try {
      const response = await versionedApiClient.getHomeData();

      if (response.error) {
        throw new Error(
          response.message ||
            response.error ||
            'Failed to get home screen data',
        );
      }

      // Ensure we never return undefined - convert to null if needed
      if (!response.data) {
        return null;
      }

      // Convert through unknown first for safer type assertion
      return (response.data as unknown as HomeScreenData) || null;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
