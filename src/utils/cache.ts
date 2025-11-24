import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_LIMITS, getCacheTTL } from './cacheConfig';

/**
 * Generic Cache Manager for persisting data to AsyncStorage with TTL support
 *
 * Features:
 * - Automatic expiration based on TTL (Time To Live)
 * - Type-safe get/set operations
 * - Graceful error handling
 * - Versioning support for cache invalidation
 * - Size limits and automatic eviction
 */

const CACHE_VERSION = 'v1'; // Increment to invalidate all caches
const CACHE_PREFIX = `@elaro_cache_${CACHE_VERSION}`;
const CACHE_METRICS_KEY = `${CACHE_PREFIX}:_metrics`;

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  lastResetAt: number;
  windowStart: number; // Start of current monitoring window (30 minutes)
}

export class CacheManager {
  private static metrics: CacheMetrics | null = null;
  /**
   * Store data in cache with expiration
   * @param key - Unique cache key
   * @param value - Data to cache
   * @param ttlMinutes - Time to live in minutes (default: auto-detect from key pattern)
   */
  static async set<T>(
    key: string,
    value: T,
    ttlMinutes?: number,
  ): Promise<void> {
    try {
      // Auto-detect TTL if not provided
      const ttl = ttlMinutes ?? Math.floor(getCacheTTL(key) / (60 * 1000));

      const now = Date.now();
      const expiresAt = now + ttl * 60 * 1000;

      const cachedData: CachedData<T> = {
        data: value,
        timestamp: now,
        expiresAt,
        version: CACHE_VERSION,
      };

      const cacheKey = `${CACHE_PREFIX}:${key}`;
      const serialized = JSON.stringify(cachedData);

      // Check cache size before adding
      await this.ensureCacheSpace(serialized.length);

      await AsyncStorage.setItem(cacheKey, serialized);

      if (__DEV__) {
        console.log(`✅ Cached: ${key} (expires in ${ttl} minutes)`);
      }
    } catch (error) {
      if (__DEV__) {
        console.error(`❌ Cache set error for ${key}:`, error);
      }
      // Don't throw - caching is an optimization, app should work without it
    }
  }

  /**
   * Ensure cache has space by evicting old entries if needed
   */
  private static async ensureCacheSpace(newItemSize: number): Promise<void> {
    try {
      const stats = await this.getStats();

      // Check if we need to evict
      const needsEviction =
        stats.totalSize + newItemSize >
          CACHE_LIMITS.MAX_CACHE_SIZE_BYTES * CACHE_LIMITS.EVICTION_THRESHOLD ||
        stats.totalEntries >=
          CACHE_LIMITS.MAX_ITEMS * CACHE_LIMITS.EVICTION_THRESHOLD;

      if (needsEviction) {
        await this.evictOldEntries();
      }
    } catch (error) {
      // Silently fail - eviction is best effort
      if (__DEV__) {
        console.warn('Cache eviction check failed:', error);
      }
    }
  }

  /**
   * Evict old cache entries (LRU - oldest first)
   */
  private static async evictOldEntries(): Promise<void> {
    try {
      const stats = await this.getStats();

      // Sort by age (oldest first)
      const sortedEntries = stats.entries.sort((a, b) => b.age - a.age);

      // Calculate how many to remove (remove 20% of entries)
      const entriesToRemove = Math.ceil(stats.totalEntries * 0.2);

      for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
        await this.remove(sortedEntries[i].key);
      }

      if (__DEV__) {
        console.log(`🗑️ Evicted ${entriesToRemove} old cache entries`);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Cache eviction failed:', error);
      }
    }
  }

  /**
   * Load cache metrics from storage
   */
  private static async loadMetrics(): Promise<CacheMetrics> {
    if (this.metrics) {
      return this.metrics;
    }

    try {
      const metricsData = await AsyncStorage.getItem(CACHE_METRICS_KEY);
      if (metricsData) {
        this.metrics = JSON.parse(metricsData);
        // Reset window if > 30 minutes old
        const now = Date.now();
        if (now - (this.metrics?.windowStart || 0) > 30 * 60 * 1000) {
          this.metrics = {
            hits: 0,
            misses: 0,
            lastResetAt: now,
            windowStart: now,
          };
          await this.saveMetrics();
        }
        return this.metrics!;
      }
    } catch (error) {
      console.error('Failed to load cache metrics:', error);
    }

    const now = Date.now();
    this.metrics = {
      hits: 0,
      misses: 0,
      lastResetAt: now,
      windowStart: now,
    };
    return this.metrics;
  }

  /**
   * Save cache metrics to storage
   */
  private static async saveMetrics(): Promise<void> {
    if (!this.metrics) return;
    try {
      await AsyncStorage.setItem(
        CACHE_METRICS_KEY,
        JSON.stringify(this.metrics),
      );
    } catch (error) {
      console.error('Failed to save cache metrics:', error);
    }
  }

  /**
   * Record a cache hit
   */
  private static async recordHit(): Promise<void> {
    const metrics = await this.loadMetrics();
    metrics.hits++;
    await this.saveMetrics();
  }

  /**
   * Record a cache miss
   */
  private static async recordMiss(): Promise<void> {
    const metrics = await this.loadMetrics();
    metrics.misses++;
    await this.saveMetrics();
  }

  /**
   * Get cache hit rate
   */
  static async getHitRate(): Promise<{
    hitRate: number;
    hits: number;
    misses: number;
    totalRequests: number;
    windowStart: number;
  }> {
    const metrics = await this.loadMetrics();
    const total = metrics.hits + metrics.misses;
    const hitRate = total > 0 ? (metrics.hits / total) * 100 : 100;
    return {
      hitRate,
      hits: metrics.hits,
      misses: metrics.misses,
      totalRequests: total,
      windowStart: metrics.windowStart,
    };
  }

  /**
   * Reset cache metrics
   */
  static async resetMetrics(): Promise<void> {
    const now = Date.now();
    this.metrics = {
      hits: 0,
      misses: 0,
      lastResetAt: now,
      windowStart: now,
    };
    await this.saveMetrics();
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
        await this.recordMiss();
        if (__DEV__) {
          console.log(`⚠️ Cache miss: ${key}`);
        }
        return null;
      }

      const cachedData: CachedData<T> = JSON.parse(cached);

      // Check version mismatch
      if (cachedData.version !== CACHE_VERSION) {
        await this.recordMiss();
        if (__DEV__) {
          console.log(`⚠️ Cache version mismatch for ${key}, invalidating`);
        }
        await this.remove(key);
        return null;
      }

      // Check expiration
      const now = Date.now();
      if (now > cachedData.expiresAt) {
        await this.recordMiss();
        if (__DEV__) {
          console.log(`⏰ Cache expired: ${key}`);
        }
        await this.remove(key);
        return null;
      }

      await this.recordHit();
      const ageMinutes = Math.floor((now - cachedData.timestamp) / 60000);
      if (__DEV__) {
        console.log(`✅ Cache hit: ${key} (age: ${ageMinutes}m)`);
      }

      return cachedData.data;
    } catch (error) {
      await this.recordMiss();
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
        cacheKeys.map(async key => {
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
        }),
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
  getHitRate: () => CacheManager.getHitRate(),
  resetMetrics: () => CacheManager.resetMetrics(),
};
