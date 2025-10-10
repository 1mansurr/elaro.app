import { supabase } from '../../supabase';
import { HomeScreenData } from '../../../types';
import { handleApiError } from '../errors';

export const homeScreenApi = {
  async getData(): Promise<HomeScreenData | null> {
    try {
      const { data, error } = await supabase.functions.invoke('get-home-screen-data');
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
