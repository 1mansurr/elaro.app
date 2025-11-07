/**
 * Query Cache Persistence Configuration
 *
 * Configures React Query cache persistence using AsyncStorage.
 * This allows the cache to persist across app restarts for better offline support.
 * Uses event-driven persistence instead of polling for better performance.
 */

import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from './debounce';

const QUERY_CACHE_KEY = '@elaro_query_cache_v1';
const PERSIST_DEBOUNCE_MS = 5000; // Persist 5 seconds after last cache change

interface SerializedQuery {
  queryKey: unknown[];
  queryHash: string;
  state: {
    data: unknown;
    dataUpdatedAt: number;
    error: unknown;
    errorUpdatedAt: number;
    status: string;
    fetchStatus: string;
  };
  options: {
    staleTime?: number;
    gcTime?: number;
    cacheTime?: number;
  };
}

/**
 * Save query cache to AsyncStorage
 */
export async function persistQueryCache(
  queryClient: QueryClient,
): Promise<void> {
  try {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    // Serialize queries for storage
    const serializedQueries = queries.map(query => ({
      queryKey: query.queryKey,
      queryHash: query.queryHash,
      state: {
        data: query.state.data,
        dataUpdatedAt: query.state.dataUpdatedAt,
        error: query.state.error,
        errorUpdatedAt: query.state.errorUpdatedAt,
        status: query.state.status,
        fetchStatus: query.state.fetchStatus,
      },
      options: {
        staleTime: query.options.staleTime,
        gcTime: query.options.gcTime || query.options.cacheTime, // gcTime is new name, cacheTime is legacy
      },
    }));

    await AsyncStorage.setItem(
      QUERY_CACHE_KEY,
      JSON.stringify(serializedQueries),
    );
    console.log('✅ Query cache persisted to storage');
  } catch (error) {
    console.error('❌ Failed to persist query cache:', error);
  }
}

/**
 * Load query cache from AsyncStorage
 */
export async function restoreQueryCache(
  queryClient: QueryClient,
): Promise<void> {
  try {
    const serialized = await AsyncStorage.getItem(QUERY_CACHE_KEY);

    if (!serialized) {
      console.log('📭 No persisted query cache found');
      return;
    }

    const queries: SerializedQuery[] = JSON.parse(serialized);

    // Restore queries to cache
    queries.forEach((queryData: SerializedQuery) => {
      queryClient.setQueryData(queryData.queryKey, queryData.state.data);
    });

    console.log(`✅ Restored ${queries.length} queries from cache`);
  } catch (error) {
    console.error('❌ Failed to restore query cache:', error);
    // Clear corrupted cache
    await AsyncStorage.removeItem(QUERY_CACHE_KEY);
  }
}

/**
 * Clear persisted query cache
 */
export async function clearQueryCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUERY_CACHE_KEY);
    console.log('🗑️ Cleared persisted query cache');
  } catch (error) {
    console.error('❌ Failed to clear query cache:', error);
  }
}

/**
 * Setup automatic cache persistence
 * Call this after creating QueryClient
 * Uses event-driven persistence instead of polling for better performance
 */
export function setupQueryCachePersistence(
  queryClient: QueryClient,
): () => void {
  // Restore cache on startup
  restoreQueryCache(queryClient).catch(console.error);

  // Create debounced persistence function
  const { debounced: debouncedPersist, cancel: cancelDebounce } = debounce(
    () => {
      persistQueryCache(queryClient).catch(console.error);
    },
    PERSIST_DEBOUNCE_MS,
  );

  // Subscribe to cache changes for event-driven persistence
  const cache = queryClient.getQueryCache();
  const unsubscribe = cache.subscribe(event => {
    // Only persist on mutations/updates, not on every query
    if (event?.type === 'updated' && event?.query?.state?.dataUpdatedAt) {
      // Debounce persistence to avoid too frequent writes
      debouncedPersist();
    }
  });

  // Note: AppState listener for background persistence is set up in App.tsx
  // This function returns cleanup
  return () => {
    unsubscribe();
    cancelDebounce();
    // Persist one final time on cleanup
    persistQueryCache(queryClient).catch(console.error);
  };
}
