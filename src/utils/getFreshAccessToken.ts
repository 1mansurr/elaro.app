import { supabase } from '@/services/supabase';

/**
 * Gets a fresh access token, refreshing if necessary.
 * 
 * This function ensures we have a valid, non-expired token before making
 * authenticated requests to edge functions. It uses getUser() which automatically
 * refreshes the token if needed and verifies it with a real API call to Supabase.
 * 
 * @returns Promise<string> - A fresh access token
 * @throws Error - If no valid user or session is found
 */
export async function getFreshAccessToken(): Promise<string> {
  // First, get the current session to check if we need to refresh
  const {
    data: { session: currentSession },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !currentSession) {
    throw new Error('No valid session found');
  }

  if (!currentSession.access_token) {
    throw new Error('No access token found in session');
  }

  // Check if token is expired or about to expire (within 60 seconds)
  const expiresAt = currentSession.expires_at;
  const now = Math.floor(Date.now() / 1000); // Convert to seconds
  const expiresAtSeconds = expiresAt || 0;
  const isExpiredOrExpiringSoon = expiresAtSeconds < now + 60;

  // If token is expired or expiring soon, refresh it explicitly
  if (isExpiredOrExpiringSoon && currentSession.refresh_token) {
    console.log('🔄 Token expired or expiring soon, refreshing session...');
    
    try {
      const {
        data: { session: refreshedSession },
        error: refreshError,
      } = await supabase.auth.refreshSession({
        refresh_token: currentSession.refresh_token,
      });

      if (refreshError) {
        console.error('❌ Failed to refresh session:', refreshError);
        
        // If refresh token is expired/invalid, user needs to sign in again
        if (
          refreshError.message?.includes('refresh_token_not_found') ||
          refreshError.message?.includes('invalid_grant') ||
          refreshError.message?.includes('token_expired') ||
          refreshError.message?.includes('Auth session missing')
        ) {
          // Clear the session to force re-authentication
          await supabase.auth.signOut();
          throw new Error('Session expired. Please sign in again.');
        }
        throw new Error('Failed to refresh token');
      }

      if (!refreshedSession?.access_token) {
        throw new Error('Failed to refresh token');
      }

      // Verify the refreshed token by calling getUser()
      const {
        data: { user },
        error: verifyError,
      } = await supabase.auth.getUser(refreshedSession.access_token);

      if (verifyError || !user) {
        console.error('❌ Refreshed token verification failed:', verifyError);
        await supabase.auth.signOut();
        throw new Error('Session expired. Please sign in again.');
      }

      console.log('✅ Session refreshed and verified successfully');
      return refreshedSession.access_token;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      throw error;
    }
  }

  // Token appears valid, but verify it's actually working with getUser()
  // This ensures the token is valid on the server side
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(currentSession.access_token);

  if (userError || !user) {
    console.warn('⚠️ Token verification failed, attempting refresh...');
    
    // Token might be stale, try refreshing
    if (currentSession.refresh_token) {
      try {
        const {
          data: { session: refreshedSession },
          error: refreshError,
        } = await supabase.auth.refreshSession({
          refresh_token: currentSession.refresh_token,
        });

        if (refreshError || !refreshedSession?.access_token) {
          await supabase.auth.signOut();
          throw new Error('Session expired. Please sign in again.');
        }

        // Verify the refreshed token
        const {
          data: { user: verifiedUser },
          error: verifyRefreshError,
        } = await supabase.auth.getUser(refreshedSession.access_token);

        if (verifyRefreshError || !verifiedUser) {
          await supabase.auth.signOut();
          throw new Error('Session expired. Please sign in again.');
        }

        console.log('✅ Session refreshed after verification failure');
        return refreshedSession.access_token;
      } catch (error) {
        console.error('❌ Token refresh after verification failure:', error);
        throw error;
      }
    } else {
      await supabase.auth.signOut();
      throw new Error('Session expired. Please sign in again.');
    }
  }

  // Token is valid
  return currentSession.access_token;
}
