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

// Use WeakMap to track persistence setup per QueryClient instance
// This survives Fast Refresh better than module-level variables
const persistenceSetupMap = new WeakMap<QueryClient, boolean>();

// Global flag to track if ANY cache has been configured
// Use global object to persist across module re-evaluation during bundling
const GLOBAL_CACHE_CONFIG_KEY = '__ELARO_QUERY_CACHE_CONFIGURED__';
const getGlobalCacheConfigured = (): boolean => {
  if (typeof global !== 'undefined') {
    return (global as any)[GLOBAL_CACHE_CONFIG_KEY] === true;
  }
  if (typeof globalThis !== 'undefined') {
    return (globalThis as any)[GLOBAL_CACHE_CONFIG_KEY] === true;
  }
  return false;
};

const setGlobalCacheConfigured = (value: boolean): void => {
  if (typeof global !== 'undefined') {
    (global as any)[GLOBAL_CACHE_CONFIG_KEY] = value;
  } else if (typeof globalThis !== 'undefined') {
    (globalThis as any)[GLOBAL_CACHE_CONFIG_KEY] = value;
  }
};

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
        staleTime: (query.options as { staleTime?: number }).staleTime,
        gcTime: (query.options as { gcTime?: number; cacheTime?: number }).gcTime || 
                (query.options as { gcTime?: number; cacheTime?: number }).cacheTime, // gcTime is new name, cacheTime is legacy
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

    // Guard: Only parse if serialized is valid
    if (
      !serialized.trim() ||
      serialized === 'undefined' ||
      serialized === 'null'
    ) {
      return;
    }

    let queries: SerializedQuery[];
    try {
      queries = JSON.parse(serialized);
    } catch {
      return;
    }

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
  // Skip in development mode to avoid Fast Refresh issues
  if (__DEV__) {
    return () => {}; // Return no-op cleanup function
  }

  // CRITICAL: Check global flag FIRST, before any operations
  // This must be the very first check to prevent errors during module evaluation
  if (getGlobalCacheConfigured()) {
    console.warn(
      '⚠️ Query cache persistence already configured globally, skipping...',
    );
    return () => {}; // Return no-op cleanup function
  }

  // Set global flag IMMEDIATELY to prevent duplicate calls
  // This must happen before any cache operations to prevent React Query errors
  setGlobalCacheConfigured(true);

  try {
    // Check if this specific QueryClient instance already has persistence configured
    // WeakMap survives Fast Refresh and tracks per-instance
    if (persistenceSetupMap.get(queryClient)) {
      console.warn(
        '⚠️ Query cache persistence already configured for this QueryClient, skipping...',
      );
      setGlobalCacheConfigured(false); // Reset since we're not actually configuring
      return () => {}; // Return no-op cleanup function
    }

    // Mark this QueryClient as configured
    persistenceSetupMap.set(queryClient, true);

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
    // Wrap in nested try-catch to prevent "Caching has already been configured" errors
    let unsubscribe: (() => void) | null = null;
    try {
      const cache = queryClient.getQueryCache();

      // CRITICAL: Check if cache already has listeners before subscribing
      // This helps prevent React Query from detecting duplicate persistence
      const cacheAny = cache as any;
      const hasListeners =
        cacheAny._listeners &&
        Array.isArray(cacheAny._listeners) &&
        cacheAny._listeners.length > 0;

      if (hasListeners) {
        // Check if any listener is our persistence listener by checking if debouncedPersist exists
        // This is a heuristic check - if listeners exist, persistence might already be configured
        console.warn(
          '⚠️ Cache already has listeners, skipping subscription to prevent duplicate persistence...',
        );
        setGlobalCacheConfigured(false); // Reset flag
        return () => {}; // Return no-op cleanup function
      }

      // CRITICAL: Wrap subscribe call in immediate try-catch to catch React Query errors
      // This catches errors thrown synchronously by React Query's internal code
      try {
        unsubscribe = cache.subscribe(event => {
          // Only persist on mutations/updates, not on every query
          if (event?.type === 'updated' && event?.query?.state?.dataUpdatedAt) {
            // Debounce persistence to avoid too frequent writes
            debouncedPersist();
          }
        });
      } catch (subscribeError: any) {
        // Catch React Query's internal error immediately
        const errorMessage = subscribeError?.message || String(subscribeError);
        if (
          errorMessage.includes('already been configured') ||
          errorMessage.includes('.never') ||
          errorMessage.includes('.forever') ||
          errorMessage.includes('Caching has already been configured')
        ) {
          console.warn(
            '⚠️ Query cache subscription failed - already configured, skipping...',
          );
          setGlobalCacheConfigured(false); // Reset flag
          return () => {}; // Return no-op cleanup function
        }
        // Re-throw other errors to be caught by outer catch
        throw subscribeError;
      }
    } catch (error: any) {
      // Outer catch for any other errors from cache operations
      const errorMessage = error?.message || String(error);
      if (
        errorMessage.includes('already been configured') ||
        errorMessage.includes('.never') ||
        errorMessage.includes('.forever') ||
        errorMessage.includes('Caching has already been configured')
      ) {
        console.warn(
          '⚠️ Query cache persistence already configured, skipping...',
        );
        setGlobalCacheConfigured(false); // Reset flag on error to allow retry
        return () => {}; // Return no-op cleanup function
      }
      // For other errors, log and continue without persistence
      console.warn('⚠️ Failed to subscribe to query cache:', error);
      setGlobalCacheConfigured(false); // Reset flag on error
      return () => {}; // Return no-op cleanup function
    }

    // Note: AppState listener for background persistence is set up in App.tsx
    // This function returns cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      cancelDebounce();
      // Persist one final time on cleanup
      persistQueryCache(queryClient).catch(console.error);
    };
  } catch (error: any) {
    // Catch any errors from the entire function
    // This includes errors that might escape the inner try-catch blocks
    const errorMessage = error?.message || String(error);
    if (
      errorMessage.includes('already been configured') ||
      errorMessage.includes('.never') ||
      errorMessage.includes('.forever') ||
      errorMessage.includes('Caching has already been configured')
    ) {
      console.warn(
        '⚠️ Query cache persistence setup failed - already configured',
      );
      setGlobalCacheConfigured(false); // Reset flag
      return () => {}; // Return no-op cleanup function
    }
    // Silently fail in development to avoid breaking Fast Refresh
    if (__DEV__) {
      console.warn(
        '⚠️ Cache persistence setup failed (development mode):',
        error,
      );
      setGlobalCacheConfigured(false); // Reset flag on error
      return () => {}; // Return no-op cleanup function
    }
    // Re-throw in production for other errors
    setGlobalCacheConfigured(false); // Reset flag before re-throwing
    throw error;
  }
}
