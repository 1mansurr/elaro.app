/**
 * React Hook for Versioned API Client
 *
 * Provides a React-friendly interface to the versioned API client
 * with automatic error handling and loading states.
 */

import { useState, useEffect, useCallback } from 'react';
import { versionedApiClient } from '../services/VersionedApiClient';
import { ApiResponse } from '../services/ApiVersioningService';
import { apiVersioningService } from '../services/ApiVersioningService';

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
  onDeprecationWarning?: (warning: {
    sunsetDate?: string;
    migrationGuide?: string;
  }) => void;
}

/**
 * Hook for making versioned API calls with automatic state management
 */
export function useVersionedApi<T = unknown>(
  apiCall: () => Promise<ApiResponse<T>>,
  options: UseApiOptions<T> = {},
): UseApiState<T> & {
  refetch: () => Promise<void>;
  reset: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deprecationWarning, setDeprecationWarning] = useState(false);
  const [sunsetDate, setSunsetDate] = useState<string | undefined>();
  const [migrationGuide, setMigrationGuide] = useState<string | undefined>();

  const {
    autoFetch = true,
    onSuccess,
    onError,
    onDeprecationWarning,
  } = options;

  const executeApiCall = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall();

      if (response.error) {
        setError(response.error);
        onError?.(response.error);
      } else {
        if (response.data !== undefined) {
          setData(response.data);
          onSuccess?.(response.data);
        } else {
          setData(null);
        }
      }

      // Handle version warnings
      if (response.deprecationWarning) {
        setDeprecationWarning(true);
        setSunsetDate(response.sunsetDate);
        setMigrationGuide(response.migrationGuide);
        onDeprecationWarning?.({
          sunsetDate: response.sunsetDate,
          migrationGuide: response.migrationGuide,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [apiCall, onSuccess, onError, onDeprecationWarning]);

  const refetch = useCallback(async () => {
    await executeApiCall();
  }, [executeApiCall]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    setDeprecationWarning(false);
    setSunsetDate(undefined);
    setMigrationGuide(undefined);
  }, []);

  useEffect(() => {
    if (autoFetch) {
      executeApiCall();
    }
  }, [autoFetch, executeApiCall]);

  return {
    data,
    loading,
    error,
    deprecationWarning,
    sunsetDate,
    migrationGuide,
    refetch,
    reset,
  };
}

/**
 * Hook for courses API
 */
export function useCourses() {
  const getCourses = useCallback(() => versionedApiClient.getCourses(), []);

  return useVersionedApi(getCourses, {
    onDeprecationWarning: warning => {
      console.warn('Courses API deprecation warning:', warning);
    },
  });
}

/**
 * Hook for assignments API
 */
export function useAssignments() {
  const getAssignments = useCallback(
    () => versionedApiClient.getAssignments(),
    [],
  );

  return useVersionedApi(getAssignments, {
    onDeprecationWarning: warning => {
      console.warn('Assignments API deprecation warning:', warning);
    },
  });
}

/**
 * Hook for lectures API
 */
export function useLectures() {
  const getLectures = useCallback(() => versionedApiClient.getLectures(), []);

  return useVersionedApi(getLectures, {
    onDeprecationWarning: warning => {
      console.warn('Lectures API deprecation warning:', warning);
    },
  });
}

/**
 * Hook for study sessions API
 */
export function useStudySessions() {
  const getStudySessions = useCallback(
    () => versionedApiClient.getStudySessions(),
    [],
  );

  return useVersionedApi(getStudySessions, {
    onDeprecationWarning: warning => {
      console.warn('Study Sessions API deprecation warning:', warning);
    },
  });
}

/**
 * Hook for user profile API
 */
export function useUserProfile() {
  const getUserProfile = useCallback(
    () => versionedApiClient.getUserProfile(),
    [],
  );

  return useVersionedApi(getUserProfile, {
    onDeprecationWarning: warning => {
      console.warn('User Profile API deprecation warning:', warning);
    },
  });
}

/**
 * Hook for home data analytics
 */
export function useHomeData() {
  const getHomeData = useCallback(() => versionedApiClient.getHomeData(), []);

  return useVersionedApi(getHomeData, {
    onDeprecationWarning: warning => {
      console.warn('Home Data API deprecation warning:', warning);
    },
  });
}

/**
 * Hook for calendar data
 */
export function useCalendarData(weekStart: string) {
  const getCalendarData = useCallback(
    () => versionedApiClient.getCalendarData(weekStart),
    [weekStart],
  );

  return useVersionedApi(getCalendarData, {
    autoFetch: !!weekStart,
    onDeprecationWarning: warning => {
      console.warn('Calendar Data API deprecation warning:', warning);
    },
  });
}

/**
 * Hook for API version management
 */
export function useApiVersion() {
  const [currentVersion, setCurrentVersion] = useState(
    versionedApiClient.getCurrentVersion(),
  );
  const [migrationRecommendations, setMigrationRecommendations] = useState<
    string[]
  >([]);
  const [checkingCompatibility, setCheckingCompatibility] = useState(false);

  const checkCompatibility = useCallback(async () => {
    setCheckingCompatibility(true);
    try {
      await versionedApiClient.checkCompatibility();
      const recommendations =
        await versionedApiClient.getMigrationRecommendations();
      setMigrationRecommendations(recommendations);
    } catch (error) {
      console.error('Failed to check API compatibility:', error);
    } finally {
      setCheckingCompatibility(false);
    }
  }, []);

  const upgradeToLatest = useCallback(async () => {
    try {
      const upgraded = await versionedApiClient.upgradeToLatest();
      if (upgraded) {
        setCurrentVersion(versionedApiClient.getCurrentVersion());
        await checkCompatibility();
      }
      return upgraded;
    } catch (error) {
      console.error('Failed to upgrade API version:', error);
      return false;
    }
  }, [checkCompatibility]);

  const setVersion = useCallback(
    (version: string) => {
      try {
        versionedApiClient.setVersion(version);
        setCurrentVersion(version);
        checkCompatibility();
      } catch (error) {
        console.error('Failed to set API version:', error);
      }
    },
    [checkCompatibility],
  );

  useEffect(() => {
    checkCompatibility();
  }, [checkCompatibility]);

  return {
    currentVersion,
    migrationRecommendations,
    checkingCompatibility,
    checkCompatibility,
    upgradeToLatest,
    setVersion,
  };
}

/**
 * Hook for batch operations
 */
export function useBatchOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeBatch = useCallback(
    async (
      operations: Array<{
        type: string;
        table: string;
        action: string;
        data?: Record<string, unknown>;
        filters?: Record<string, string | number | boolean>;
      }>,
    ) => {
      setLoading(true);
      setError(null);

      try {
        const response = await versionedApiClient.batchOperations(operations);

        if (response.error) {
          setError(response.error);
          return { success: false, error: response.error };
        }

        return { success: true, data: response.data };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    executeBatch,
    loading,
    error,
  };
}
