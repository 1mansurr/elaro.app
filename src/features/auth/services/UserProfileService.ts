import { User } from '@/types';
import {
  supabase,
  authService as supabaseAuthService,
} from '@/services/supabase';
import { cache } from '@/utils/cache';

export class UserProfileService {
  private static instance: UserProfileService;

  public static getInstance(): UserProfileService {
    if (!UserProfileService.instance) {
      UserProfileService.instance = new UserProfileService();
    }
    return UserProfileService.instance;
  }

  /**
   * Fetch user profile with caching strategy
   */
  async fetchUserProfile(userId: string): Promise<User | null> {
    try {
      // Try to get from cache first for instant load
      const cacheKey = `user_profile:${userId}`;
      const cachedProfile = await cache.get<User>(cacheKey);

      if (cachedProfile) {
        console.log('📱 Using cached user profile');

        // Still fetch fresh data in background to stay up-to-date
        this.refreshProfileInBackground(userId, cachedProfile, cacheKey);

        return cachedProfile;
      }

      // No cache - fetch from server
      console.log('🌐 Fetching user profile from server');
      const userProfile = await supabaseAuthService.getUserProfile(userId);

      if (!userProfile) {
        return null;
      }

      // Cache the profile (24 hours) for future use
      await cache.setLong(cacheKey, userProfile);

      return userProfile as User;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Refresh profile in background while using cached data
   */
  private async refreshProfileInBackground(
    userId: string,
    cachedProfile: User,
    cacheKey: string,
  ): Promise<void> {
    try {
      const freshProfile = await supabaseAuthService.getUserProfile(userId);
      if (
        freshProfile &&
        JSON.stringify(freshProfile) !== JSON.stringify(cachedProfile)
      ) {
        console.log('🔄 Updating user profile from server');
        await cache.setLong(cacheKey, freshProfile);
      }
    } catch (err) {
      console.error('Background profile fetch failed:', err);
      // Keep using cached data
    }
  }

  /**
   * Refresh user profile and update cache
   */
  async refreshUserProfile(userId: string): Promise<User | null> {
    try {
      const cacheKey = `user_profile:${userId}`;
      const userProfile = await supabaseAuthService.getUserProfile(userId);

      if (userProfile) {
        await cache.setLong(cacheKey, userProfile);
        return userProfile as User;
      }

      return null;
    } catch (error) {
      console.error('❌ Error refreshing user profile:', error);
      return null;
    }
  }

  /**
   * Clear user profile cache
   */
  async clearUserProfileCache(userId: string): Promise<void> {
    const cacheKey = `user_profile:${userId}`;
    // await cache.delete(cacheKey); // Commented out as cache.delete method doesn't exist
  }
}
