// Offline MVP stub — versioned API client removed

import { useState, useCallback } from 'react';

export interface UseApiState<T = unknown> {
  data: T | null;
  loading: boolean;
  error: string | null;
  deprecationWarning: boolean;
  sunsetDate?: string;
  migrationGuide?: string;
}

export interface UseApiOptions<T = unknown> {
  autoFetch?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  onDeprecationWarning?: (warning: { sunsetDate?: string; migrationGuide?: string }) => void;
}

export function useVersionedApi<T = unknown>(
  _apiCall: () => Promise<unknown>,
  _options: UseApiOptions<T> = {},
): UseApiState<T> & { refetch: () => Promise<void>; reset: () => void } {
  const [data] = useState<T | null>(null);
  const refetch = useCallback(async () => {}, []);
  const reset = useCallback(() => {}, []);
  return { data, loading: false, error: null, deprecationWarning: false, refetch, reset };
}

export function useCourses() { return useVersionedApi(() => Promise.resolve(null)); }
export function useAssignments() { return useVersionedApi(() => Promise.resolve(null)); }
export function useLectures() { return useVersionedApi(() => Promise.resolve(null)); }
export function useStudySessions() { return useVersionedApi(() => Promise.resolve(null)); }
export function useUserProfile() { return useVersionedApi(() => Promise.resolve(null)); }
export function useHomeData() { return useVersionedApi(() => Promise.resolve(null)); }
export function useCalendarData(_weekStart: string) { return useVersionedApi(() => Promise.resolve(null)); }

export function useApiVersion() {
  const checkCompatibility = useCallback(async () => {}, []);
  const upgradeToLatest = useCallback(async () => false, []);
  const setVersion = useCallback((_version: string) => {}, []);
  return {
    currentVersion: '1.0.0',
    migrationRecommendations: [] as string[],
    checkingCompatibility: false,
    checkCompatibility,
    upgradeToLatest,
    setVersion,
  };
}

export function useBatchOperations() {
  const executeBatch = useCallback(async (_operations: unknown[]) => ({ success: false, error: 'Not available in offline mode' }), []);
  return { executeBatch, loading: false, error: null as string | null };
}
