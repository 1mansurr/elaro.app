import { cache } from '@/utils/cache';
import { Permission, UserRole } from './PermissionConstants';

export interface CachedPermissionData {
  permissions: Permission[];
  role: UserRole;
  timestamp: number;
  ttl: number;
}

export class PermissionCacheService {
  private static instance: PermissionCacheService;
  private memoryCache = new Map<string, CachedPermissionData>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): PermissionCacheService {
    if (!PermissionCacheService.instance) {
      PermissionCacheService.instance = new PermissionCacheService();
    }
    return PermissionCacheService.instance;
  }

  /**
   * Get cached permission data for user
   */
  async getCachedPermissions(userId: string): Promise<CachedPermissionData | null> {
    try {
      // Check memory cache first
      const memoryCached = this.memoryCache.get(userId);
      if (memoryCached && this.isValid(memoryCached)) {
        return memoryCached;
      }

      // Check persistent cache
      const cacheKey = `permissions:${userId}`;
      const persistentCached = await cache.get<CachedPermissionData>(cacheKey);
      
      if (persistentCached && this.isValid(persistentCached)) {
        // Update memory cache
        this.memoryCache.set(userId, persistentCached);
        return persistentCached;
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting cached permissions:', error);
      return null;
    }
  }

  /**
   * Cache permission data for user
   */
  async cachePermissions(
    userId: string, 
    permissions: Permission[], 
    role: UserRole, 
    ttl?: number
  ): Promise<void> {
    try {
      const cacheData: CachedPermissionData = {
        permissions,
        role,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL,
      };

      // Cache in memory
      this.memoryCache.set(userId, cacheData);

      // Cache persistently
      const cacheKey = `permissions:${userId}`;
      await cache.set(cacheKey, cacheData, ttl || this.defaultTTL);
    } catch (error) {
      console.error('❌ Error caching permissions:', error);
    }
  }

  /**
   * Check if cached data is still valid
   */
  private isValid(cachedData: CachedPermissionData): boolean {
    return Date.now() - cachedData.timestamp < cachedData.ttl;
  }

  /**
   * Invalidate cache for specific user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      // Remove from memory cache
      this.memoryCache.delete(userId);

      // Remove from persistent cache
      const cacheKey = `permissions:${userId}`;
      await cache.delete(cacheKey);
    } catch (error) {
      console.error('❌ Error invalidating user cache:', error);
    }
  }

  /**
   * Clear all permission cache
   */
  async clearAllCache(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear persistent cache (this would need to be implemented in cache service)
      // For now, we'll just clear memory cache
      console.log('🗑️ Cleared all permission cache');
    } catch (error) {
      console.error('❌ Error clearing all cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memoryCacheSize: number;
    memoryCacheKeys: string[];
  } {
    return {
      memoryCacheSize: this.memoryCache.size,
      memoryCacheKeys: Array.from(this.memoryCache.keys()),
    };
  }

  /**
   * Clean up expired entries from memory cache
   */
  cleanupExpiredEntries(): void {
    try {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, value] of this.memoryCache.entries()) {
        if (!this.isValid(value)) {
          expiredKeys.push(key);
        }
      }

      expiredKeys.forEach(key => this.memoryCache.delete(key));
      
      if (expiredKeys.length > 0) {
        console.log(`🧹 Cleaned up ${expiredKeys.length} expired permission cache entries`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up expired entries:', error);
    }
  }
}
