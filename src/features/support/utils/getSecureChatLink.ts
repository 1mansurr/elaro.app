import { supabase } from '@/services/supabase';
import { User } from '@supabase/supabase-js';

export async function getSecureChatLink(user: User): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('get-secure-chat-link');

    if (error) {
      throw new Error(error.message);
    }

    if (data && data.secureUrl) {
      return data.secureUrl;
    } else {
      throw new Error('Could not retrieve the secure chat link.');
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get secure chat link');
  }
}

