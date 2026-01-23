/**
 * Cache Recovery Utilities
 *
 * Provides recovery strategies for cache corruption and data errors.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { executeWithRecovery, RecoveryStrategy } from './errorRecovery';
import { restoreQueryCache, clearQueryCache } from './queryCachePersistence';

/**
 * Validate cache data structure
 */
function validateCacheData(data: unknown): boolean {
  if (!data) return false;

  try {
    if (typeof data === 'string') {
      // Guard: Only parse if data is valid
      if (!data.trim() || data === 'undefined' || data === 'null') {
        return false;
      }

      try {
        // Guard: Only parse if data is valid
        if (!data.trim() || data === 'undefined' || data === 'null') {
          throw new Error('Invalid cache data');
        }

        let parsed: any;
        try {
          parsed = JSON.parse(data);
        } catch {
          throw new Error('Failed to parse cache data');
        }
        return Array.isArray(parsed) || typeof parsed === 'object';
      } catch {
        return false;
      }
    }

    return Array.isArray(data) || typeof data === 'object';
  } catch {
    return false;
  }
}

/**
 * Restore query cache with recovery strategy
 * Primary: Restore from AsyncStorage
 * Fallback 1: Validate and fix corrupted cache
 * Fallback 2: Clear corrupted cache and re-fetch
 */
export async function restoreQueryCacheWithRecovery(
  queryClient: QueryClient,
): Promise<void> {
  const strategy: RecoveryStrategy<void> = {
    primary: async () => {
      await restoreQueryCache(queryClient);
    },
    fallbacks: [
      // Fallback 1: Validate cache and fix if corrupted
      async () => {
        try {
          const cached = await AsyncStorage.getItem('@elaro_query_cache_v1');

          if (!cached) {
            throw new Error('No cache found');
          }

          // Validate cache structure
          if (!validateCacheData(cached)) {
            throw new Error('Cache data is corrupted');
          }

          // Try to parse and restore
          // Guard: Only parse if cached is valid
          if (
            !cached ||
            !cached.trim() ||
            cached === 'undefined' ||
            cached === 'null'
          ) {
            throw new Error('No valid cache found');
          }

          let queries: any;
          try {
            queries = JSON.parse(cached);
          } catch {
            throw new Error('Failed to parse cached queries');
          }

          // Validate each query structure
          const validQueries = queries.filter((q: unknown) => {
            if (!q || typeof q !== 'object') return false;
            const query = q as { queryKey?: unknown; state?: unknown };
            return query.queryKey && query.state;
          });

          if (validQueries.length === 0) {
            throw new Error('No valid queries in cache');
          }

          // Restore valid queries
          validQueries.forEach(
            (query: { queryKey: unknown; state: { data: unknown } }) => {
              queryClient.setQueryData(query.queryKey as readonly unknown[], query.state.data);
            },
          );

          console.log(
            `✅ Restored ${validQueries.length} valid queries from corrupted cache`,
          );
        } catch (error) {
          throw new Error('Failed to fix corrupted cache');
        }
      },
      // Fallback 2: Clear corrupted cache
      async () => {
        console.warn('⚠️ Clearing corrupted cache');
        await clearQueryCache();
        // Cache will be rebuilt on next query
      },
    ],
    shouldRetry: () => true,
    onFailure: (error, attempt) => {
      console.warn(
        `⚠️ Cache restoration attempt ${attempt} failed:`,
        error.message,
      );
    },
  };

  return executeWithRecovery(strategy);
}

/**
 * Validate sync queue structure
 */
export async function validateSyncQueue(): Promise<boolean> {
  try {
    const queueData = await AsyncStorage.getItem('@elaro_offline_queue_v1');

    if (!queueData) {
      return true; // Empty queue is valid
    }

    if (!validateCacheData(queueData)) {
      return false;
    }

    // Guard: Only parse if queueData is valid
    if (
      !queueData.trim() ||
      queueData === 'undefined' ||
      queueData === 'null'
    ) {
      return false;
    }

    let queue: any;
    try {
      queue = JSON.parse(queueData);
    } catch {
      return false;
    }

    // Validate queue structure
    if (!Array.isArray(queue)) {
      return false;
    }

    // Validate each action
    return queue.every((action: unknown) => {
      if (!action || typeof action !== 'object') return false;
      const act = action as {
        type?: string;
        entity?: string;
        payload?: unknown;
      };
      return act.type && act.entity && act.payload !== undefined;
    });
  } catch {
    return false;
  }
}

/**
 * Recover sync queue from corruption
 * Primary: Use existing queue
 * Fallback 1: Validate and fix corrupted queue
 * Fallback 2: Clear corrupted queue
 */
export async function recoverSyncQueue(): Promise<void> {
  const strategy: RecoveryStrategy<void> = {
    primary: async () => {
      const isValid = await validateSyncQueue();
      if (!isValid) {
        throw new Error('Sync queue is corrupted');
      }
    },
    fallbacks: [
      // Fallback 1: Try to fix corrupted queue
      async () => {
        try {
          const queueData = await AsyncStorage.getItem(
            '@elaro_offline_queue_v1',
          );

          if (!queueData) {
            return; // No queue to fix
          }

          // Guard: Only parse if queueData is valid
          if (
            !queueData ||
            !queueData.trim() ||
            queueData === 'undefined' ||
            queueData === 'null'
          ) {
            throw new Error('No valid queue data found');
          }

          let queue: any;
          try {
            queue = JSON.parse(queueData);
          } catch {
            throw new Error('Failed to parse queue data');
          }

          // Filter out invalid actions
          const validActions = queue.filter((action: unknown) => {
            if (!action || typeof action !== 'object') return false;
            const act = action as {
              type?: string;
              entity?: string;
              payload?: unknown;
            };
            return act.type && act.entity && act.payload !== undefined;
          });

          // Save cleaned queue
          await AsyncStorage.setItem(
            '@elaro_offline_queue_v1',
            JSON.stringify(validActions),
          );

          console.log(
            `✅ Fixed sync queue: ${validActions.length}/${queue.length} actions valid`,
          );
        } catch (error) {
          throw new Error('Failed to fix corrupted queue');
        }
      },
      // Fallback 2: Clear corrupted queue
      async () => {
        console.warn('⚠️ Clearing corrupted sync queue');
        await AsyncStorage.removeItem('@elaro_offline_queue_v1');
        // Queue will be rebuilt as user creates new actions
      },
    ],
    shouldRetry: () => true,
    onFailure: (error, attempt) => {
      console.warn(
        `⚠️ Sync queue recovery attempt ${attempt} failed:`,
        error.message,
      );
    },
  };

  return executeWithRecovery(strategy);
}
