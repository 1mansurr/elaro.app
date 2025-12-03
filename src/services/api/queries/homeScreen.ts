import { supabase } from '@/services/supabase';
import { HomeScreenData } from '@/types';
import { handleApiError } from '../errors';

export const homeScreenApi = {
  async getData(): Promise<HomeScreenData | null> {
    try {
      // Get current session to ensure we have a valid token
      // Explicitly passing Authorization header ensures Edge Function receives the JWT
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error('No valid session found');
      }

      const { data, error } = await supabase.functions.invoke(
        'get-home-screen-data',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
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
