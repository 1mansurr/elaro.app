import { useState, useEffect, useCallback } from 'react';

interface HealthCheckResponse {
  status: string;
}

interface ServiceStatus {
  status: string;
  name: string;
}

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
export const useHealthCheck = (
  autoCheck: boolean = true,
): UseHealthCheckReturn => {
  const [healthStatus] = useState<HealthCheckResponse | null>(null);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const [lastChecked] = useState<Date | null>(null);

  const isHealthy = healthStatus?.status === 'ok';

  const checkHealth = useCallback(async (_useCache: boolean = true) => {
    // health check service removed
  }, []);

  const checkService = useCallback(
    async (_serviceName: string): Promise<ServiceStatus | null> => {
      return null;
    },
    [],
  );

  const getErrorDetails = useCallback(async (): Promise<string[]> => {
    return [];
  }, []);

  const clearCache = useCallback(() => {
    // health check service removed
  }, []);

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
 */
export const useSimpleHealthCheck = () => {
  const [isHealthy] = useState<boolean | null>(null);
  const [isLoading] = useState(false);

  const checkHealth = useCallback(async () => {
    return false;
  }, []);

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
 */
export const useServiceHealth = (_serviceName: string) => {
  const [serviceStatus] = useState<ServiceStatus | null>(null);
  const [isLoading] = useState(false);

  const checkService = useCallback(async () => {
    return null;
  }, []);

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
