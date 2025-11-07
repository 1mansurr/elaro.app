import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { UserProfileService } from '../services/UserProfileService';

export interface UseUserProfileReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  clearCache: () => Promise<void>;
}

export const useUserProfile = (userId?: string): UseUserProfileReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userProfileService = UserProfileService.getInstance();

  const fetchUserProfile = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);
        const userProfile = await userProfileService.fetchUserProfile(id);
        setUser(userProfile);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch user profile';
        setError(errorMessage);
        console.error('❌ Error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    },
    [userProfileService],
  );

  const refreshUser = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const userProfile = await userProfileService.refreshUserProfile(userId);
      setUser(userProfile);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to refresh user profile';
      setError(errorMessage);
      console.error('❌ Error refreshing user profile:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, userProfileService]);

  const clearCache = useCallback(async () => {
    if (!userId) return;

    try {
      await userProfileService.clearUserProfileCache(userId);
    } catch (err) {
      console.error('❌ Error clearing user profile cache:', err);
    }
  }, [userId, userProfileService]);

  useEffect(() => {
    if (userId) {
      fetchUserProfile(userId);
    } else {
      setUser(null);
      setLoading(false);
      setError(null);
    }
  }, [userId, fetchUserProfile]);

  return {
    user,
    loading,
    error,
    refreshUser,
    clearCache,
  };
};
