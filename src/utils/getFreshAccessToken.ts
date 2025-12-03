import { supabase } from '@/services/supabase';

/**
 * Gets a fresh access token, refreshing if necessary.
 * 
 * This function ensures we have a valid, non-expired token before making
 * authenticated requests to edge functions. It uses getUser() which forces
 * a token refresh if the current token is expired or about to expire.
 * 
 * @returns Promise<string> - A fresh access token
 * @throws Error - If no valid user or session is found
 */
export async function getFreshAccessToken(): Promise<string> {
  // getUser() forces a token refresh if needed by calling /auth/v1/user
  // This ensures we have a valid token before making edge function calls
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('No valid user found');
  }

  // Get the session (should now have a fresh token after getUser())
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error('No valid session found');
  }

  // Check if token is expired or about to expire (within 60 seconds)
  const expiresAt = session.expires_at;
  if (expiresAt && expiresAt * 1000 < Date.now() + 60000) {
    // Token expires soon, force another refresh
    await supabase.auth.getUser();
    const {
      data: { session: refreshedSession },
    } = await supabase.auth.getSession();
    
    if (!refreshedSession?.access_token) {
      throw new Error('Failed to refresh token');
    }
    
    return refreshedSession.access_token;
  }

  return session.access_token;
}

