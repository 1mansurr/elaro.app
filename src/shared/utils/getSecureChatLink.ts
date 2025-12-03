import { supabase } from '@/services/supabase';
import { User } from '@/types/entities';

export async function getSecureChatLink(user: User): Promise<string> {
  try {
    // Get fresh access token to ensure it's valid
    const { getFreshAccessToken } = await import('@/utils/getFreshAccessToken');
    const accessToken = await getFreshAccessToken();
    
    const { data, error } = await supabase.functions.invoke(
      'get-secure-chat-link',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    if (data && data.secureUrl) {
      return data.secureUrl;
    } else {
      throw new Error('Could not retrieve the secure chat link.');
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    throw new Error(err?.message || 'Failed to get secure chat link');
  }
}
