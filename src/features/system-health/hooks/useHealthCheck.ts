import { useState, useEffect, useCallback } from 'react';
import { healthCheckService, HealthCheckResponse, ServiceStatus } from '@/services/healthCheckService';

interface UseHealthCheckReturn {
  healthStatus: HealthCheckResponse | null;
  isLoading: boolean;
  error: string | null;
  isHealthy: boolean;
  lastChecked: Date | null;
  checkHealth: (useCache?: boolean) => Promise<void>;
  checkService: (serviceName: string) => Promise<ServiceStatus | null>;
  getErrorDetails: () => Promise<string[]>;
  clearCache: () => void;
}

/**
 * React hook for monitoring application health status.
 * Provides an easy way to check system health and handle service outages.
 */
export const useHealthCheck = (autoCheck: boolean = true): UseHealthCheckReturn => {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const isHealthy = healthStatus?.status === 'ok';

  /**
   * Performs a health check and updates state.
   */
  const checkHealth = useCallback(async (useCache: boolean = true) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await healthCheckService.checkHealth(useCache);
      setHealthStatus(result);
      setLastChecked(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Health check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Checks a specific service.
   */
  const checkService = useCallback(async (serviceName: string): Promise<ServiceStatus | null> => {
    try {
      return await healthCheckService.checkService(serviceName);
    } catch (err) {
      console.error(`Failed to check service ${serviceName}:`, err);
      return null;
    }
  }, []);

  /**
   * Gets detailed error information.
   */
  const getErrorDetails = useCallback(async (): Promise<string[]> => {
    try {
      return await healthCheckService.getErrorDetails();
    } catch (err) {
      console.error('Failed to get error details:', err);
      return ['Unable to retrieve error details'];
    }
  }, []);

  /**
   * Clears the health check cache.
   */
  const clearCache = useCallback(() => {
    healthCheckService.clearCache();
    setHealthStatus(null);
    setLastChecked(null);
  }, []);

  // Auto-check health on mount if enabled
  useEffect(() => {
    if (autoCheck) {
      checkHealth();
    }
  }, [autoCheck, checkHealth]);

  return {
    healthStatus,
    isLoading,
    error,
    isHealthy,
    lastChecked,
    checkHealth,
    checkService,
    getErrorDetails,
    clearCache,
  };
};

/**
 * Simplified hook for basic health monitoring.
 * Returns just the essential health status without complex state management.
 */
export const useSimpleHealthCheck = () => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      const healthy = await healthCheckService.isHealthy();
      setIsHealthy(healthy);
      return healthy;
    } catch (error) {
      console.error('Health check failed:', error);
      setIsHealthy(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-check on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    isHealthy,
    isLoading,
    checkHealth,
  };
};

/**
 * Hook for monitoring a specific service.
 * Useful when you only care about one service's health status.
 */
export const useServiceHealth = (serviceName: string) => {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkService = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = await healthCheckService.checkService(serviceName);
      setServiceStatus(status);
      return status;
    } catch (error) {
      console.error(`Failed to check ${serviceName}:`, error);
      setServiceStatus(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [serviceName]);

  // Auto-check on mount
  useEffect(() => {
    checkService();
  }, [checkService]);

  return {
    serviceStatus,
    isHealthy: serviceStatus?.status === 'ok',
    isLoading,
    checkService,
  };
};
