import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Generic Cache Manager for persisting data to AsyncStorage with TTL support
 * 
 * Features:
 * - Automatic expiration based on TTL (Time To Live)
 * - Type-safe get/set operations
 * - Graceful error handling
 * - Versioning support for cache invalidation
 */

const CACHE_VERSION = 'v1'; // Increment to invalidate all caches
const CACHE_PREFIX = `@elaro_cache_${CACHE_VERSION}`;

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
}

export class CacheManager {
  /**
   * Store data in cache with expiration
   * @param key - Unique cache key
   * @param value - Data to cache
   * @param ttlMinutes - Time to live in minutes (default: 1440 = 24 hours)
   */
  static async set<T>(
    key: string, 
    value: T, 
    ttlMinutes: number = 1440
  ): Promise<void> {
    try {
      const now = Date.now();
      const expiresAt = now + (ttlMinutes * 60 * 1000);
      
      const cachedData: CachedData<T> = {
        data: value,
        timestamp: now,
        expiresAt,
        version: CACHE_VERSION,
      };

      const cacheKey = `${CACHE_PREFIX}:${key}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData));
      
      console.log(`✅ Cached: ${key} (expires in ${ttlMinutes} minutes)`);
    } catch (error) {
      console.error(`❌ Cache set error for ${key}:`, error);
      // Don't throw - caching is an optimization, app should work without it
    }
  }

  /**
   * Retrieve data from cache
   * @param key - Cache key to retrieve
   * @returns Cached data or null if expired/not found
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = `${CACHE_PREFIX}:${key}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) {
        console.log(`⚠️ Cache miss: ${key}`);
        return null;
      }

      const cachedData: CachedData<T> = JSON.parse(cached);
      
      // Check version mismatch
      if (cachedData.version !== CACHE_VERSION) {
        console.log(`⚠️ Cache version mismatch for ${key}, invalidating`);
        await this.remove(key);
        return null;
      }

      // Check expiration
      const now = Date.now();
      if (now > cachedData.expiresAt) {
        console.log(`⏰ Cache expired: ${key}`);
        await this.remove(key);
        return null;
      }

      const ageMinutes = Math.floor((now - cachedData.timestamp) / 60000);
      console.log(`✅ Cache hit: ${key} (age: ${ageMinutes}m)`);
      
      return cachedData.data;
    } catch (error) {
      console.error(`❌ Cache get error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove specific cache entry
   * @param key - Cache key to remove
   */
  static async remove(key: string): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX}:${key}`;
      await AsyncStorage.removeItem(cacheKey);
      console.log(`🗑️ Cache removed: ${key}`);
    } catch (error) {
      console.error(`❌ Cache remove error for ${key}:`, error);
    }
  }

  /**
   * Clear all cache entries
   * Useful for logout or force refresh
   */
  static async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🗑️ Cleared ${cacheKeys.length} cache entries`);
      }
    } catch (error) {
      console.error('❌ Clear all cache error:', error);
    }
  }

  /**
   * Get cache statistics
   * Useful for debugging and monitoring
   */
  static async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    entries: Array<{ key: string; age: number; size: number }>;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      
      const entries = await Promise.all(
        cacheKeys.map(async (key) => {
          const value = await AsyncStorage.getItem(key);
          const size = value ? new Blob([value]).size : 0;
          
          try {
            const cached: CachedData<any> = JSON.parse(value || '{}');
            const age = Math.floor((Date.now() - cached.timestamp) / 60000);
            
            return {
              key: key.replace(`${CACHE_PREFIX}:`, ''),
              age,
              size,
            };
          } catch {
            return { key, age: 0, size };
          }
        })
      );

      const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);

      return {
        totalEntries: cacheKeys.length,
        totalSize,
        entries,
      };
    } catch (error) {
      console.error('❌ Get cache stats error:', error);
      return { totalEntries: 0, totalSize: 0, entries: [] };
    }
  }
}

// Export convenience functions for common TTL values
export const cache = {
  // Short-lived cache (5 minutes) - for frequently changing data
  setShort: <T>(key: string, value: T) => CacheManager.set(key, value, 5),
  
  // Medium cache (1 hour) - for moderately stable data
  setMedium: <T>(key: string, value: T) => CacheManager.set(key, value, 60),
  
  // Long cache (24 hours) - for rarely changing data
  setLong: <T>(key: string, value: T) => CacheManager.set(key, value, 1440),
  
  // Week-long cache (7 days) - for very stable data
  setWeek: <T>(key: string, value: T) => CacheManager.set(key, value, 10080),
  
  get: <T>(key: string) => CacheManager.get<T>(key),
  remove: (key: string) => CacheManager.remove(key),
  clearAll: () => CacheManager.clearAll(),
  getStats: () => CacheManager.getStats(),
};

