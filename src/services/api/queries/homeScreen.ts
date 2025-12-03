import { supabase } from '@/services/supabase';
import { HomeScreenData } from '@/types';
import { handleApiError } from '../errors';
import { getFreshAccessToken } from '@/utils/getFreshAccessToken';

export const homeScreenApi = {
  async getData(): Promise<HomeScreenData | null> {
    try {
      // Get fresh access token to ensure it's valid and not expired
      const accessToken = await getFreshAccessToken();

      const { data, error } = await supabase.functions.invoke(
        'get-home-screen-data',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
