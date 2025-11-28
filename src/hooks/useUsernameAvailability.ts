import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { debounce } from '@/utils/debounce';

export interface UseUsernameAvailabilityReturn {
  username: string;
  setUsername: (username: string) => void;
  isAvailable: boolean | null;
  isChecking: boolean;
  usernameError: string | null;
  checkUsername: (username: string) => void;
  clearAvailabilityState: () => void;
  reset: () => void;
}

/**
 * Custom hook for managing username availability checking
 * 
 * Features:
 * - Debounced API calls (250ms delay)
 * - Request cancellation on new input
 * - Timeout handling (10s)
 * - Session validation
 * - Error handling
 * 
 * @param initialUsername - Initial username value (optional)
 * @returns Username state and availability checking utilities
 */
export const useUsernameAvailability = (
  initialUsername?: string,
): UseUsernameAvailabilityReturn => {
  const { session } = useAuth();

  // Username state
  const [username, setUsername] = useState(initialUsername || '');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(
    initialUsername ? true : null,
  );
  const [isChecking, setIsChecking] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [lastCheckedUsername, setLastCheckedUsername] = useState<string | null>(
    initialUsername || null,
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced username checking function
  const { debounced: checkUsernameDebounced, cancel: cancelUsernameDebounce } =
    useMemo(() => {
      const { debounced, cancel } = debounce(async (newUsername: string) => {
        setIsChecking(true);
        if (newUsername.length < 4) {
          setIsAvailable(null);
          setUsernameError(null);
          setIsChecking(false);
          abortControllerRef.current?.abort();
          abortControllerRef.current = null;
          return;
        }
        if (lastCheckedUsername === newUsername) {
          setIsChecking(false);
          return;
        }
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setUsernameError(null);

        // Ensure user is authenticated before checking username
        if (!session) {
          setUsernameError('Please sign in to check username availability.');
          setIsAvailable(null);
          setIsChecking(false);
          abortControllerRef.current?.abort();
          abortControllerRef.current = null;
          return;
        }

        const timeoutId = setTimeout(() => controller.abort(), 10_000);

        try {
          // Get fresh access token from Supabase session (not from context which may be stale)
          // This ensures we have the latest valid token and the Edge Function receives the JWT for RLS context
          const {
            data: { session: currentSession },
            error: sessionError,
          } = await supabase.auth.getSession();

          // Debug logging to verify session exists
          console.log('🔍 Session Debug (check-username):', {
            hasSession: !!currentSession,
            hasError: !!sessionError,
            userId: currentSession?.user?.id,
            tokenLength: currentSession?.access_token?.length,
            tokenPreview:
              currentSession?.access_token?.substring(0, 20) + '...',
            expiresAt: currentSession?.expires_at,
            expiresIn: currentSession?.expires_in,
            username: newUsername,
          });

          if (sessionError || !currentSession) {
            console.error(
              '❌ Error getting session for username check:',
              sessionError,
            );
            setUsernameError('Please sign in to check username availability.');
            setIsAvailable(null);
            setIsChecking(false);
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
            return;
          }

          const accessToken = currentSession.access_token;
          if (!accessToken) {
            console.error('❌ No access token available for username check');
            setUsernameError('Please sign in to check username availability.');
            setIsAvailable(null);
            setIsChecking(false);
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
            return;
          }

          // Debug logging to see the actual request
          console.log(
            '📤 Calling check-username-availability with token:',
            accessToken.substring(0, 30) + '...',
          );

          const { data, error } = await supabase.functions.invoke(
            'check-username-availability',
            {
              body: { username: newUsername },
              signal: controller.signal,
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          if (error) {
            console.error('❌ Error from check-username-availability:', error);
            throw error;
          }

          if (data && typeof data.available === 'boolean') {
            if (data.available) {
              setIsAvailable(true);
              setUsernameError(null);
            } else {
              setIsAvailable(false);
              setUsernameError(data.message || 'Username is already taken.');
            }
            setLastCheckedUsername(newUsername);
          } else {
            setIsAvailable(null);
            setUsernameError('Unexpected response. Please try again.');
          }
        } catch (err: unknown) {
          console.error('Error checking username:', err);

          if ((err as { name?: string })?.name === 'AbortError') {
            setUsernameError('Request timed out. Please try again.');
          } else {
            setUsernameError("Couldn't check username. Please try again.");
          }
          setIsAvailable(null);
        } finally {
          clearTimeout(timeoutId);
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
          setIsChecking(false);
        }
      }, 250);
      return { debounced, cancel };
    }, [lastCheckedUsername, session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelUsernameDebounce();
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [cancelUsernameDebounce]);

  // Clear availability state (useful when username changes)
  const clearAvailabilityState = () => {
    setIsAvailable(null);
    setUsernameError(null);
  };

  // Reset function
  const reset = () => {
    setUsername('');
    setIsAvailable(null);
    setIsChecking(false);
    setUsernameError(null);
    setLastCheckedUsername(null);
    cancelUsernameDebounce();
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  };

  return {
    username,
    setUsername,
    isAvailable,
    isChecking,
    usernameError,
    checkUsername: checkUsernameDebounced,
    clearAvailabilityState,
    reset,
  };
};

