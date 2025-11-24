import { supabase } from './supabase';

export interface ServiceStatus {
  service: string;
  status: 'ok' | 'error';
  message?: string;
  responseTime?: number;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  services: ServiceStatus[];
  version: string;
  environment: string;
}

/**
 * Service for checking the health status of the application and its dependencies.
 * This service provides a way for the frontend to quickly diagnose if issues
 * are caused by third-party service outages.
 */
class HealthCheckService {
  private cache: { data: HealthCheckResponse | null; timestamp: number } = {
    data: null,
    timestamp: 0,
  };

  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  /**
   * Performs a comprehensive health check of all system dependencies.
   * @param useCache - Whether to use cached results if available (default: true)
   * @returns Promise<HealthCheckResponse>
   */
  async checkHealth(useCache: boolean = true): Promise<HealthCheckResponse> {
    const now = Date.now();

    // Return cached result if it's still valid and caching is enabled
    if (
      useCache &&
      this.cache.data &&
      now - this.cache.timestamp < this.CACHE_DURATION
    ) {
      console.log('Returning cached health check result');
      return this.cache.data;
    }

    try {
      console.log('Performing fresh health check...');

      const { data, error } = await supabase.functions.invoke('health-check', {
        method: 'GET',
      });

      if (error) {
        throw new Error(`Health check request failed: ${error.message}`);
      }

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid health check response format');
      }

      const healthResponse = data as HealthCheckResponse;

      // Cache the result
      this.cache = {
        data: healthResponse,
        timestamp: now,
      };

      return healthResponse;
    } catch (error) {
      console.error('Health check failed:', error);

      // Return a fallback response indicating the health check itself failed
      const fallbackResponse: HealthCheckResponse = {
        status: 'error',
        timestamp: new Date().toISOString(),
        services: [
          {
            service: 'health-check',
            status: 'error',
            message:
              error instanceof Error ? error.message : 'Unknown error occurred',
          },
        ],
        version: '1.0.0',
        environment: 'unknown',
      };

      return fallbackResponse;
    }
  }

  /**
   * Checks if a specific service is healthy.
   * @param serviceName - Name of the service to check
   * @returns Promise<ServiceStatus | null>
   */
  async checkService(serviceName: string): Promise<ServiceStatus | null> {
    const healthResponse = await this.checkHealth();
    return healthResponse.services.find(s => s.service === serviceName) || null;
  }

  /**
   * Checks if all critical services are healthy.
   * @returns Promise<boolean>
   */
  async isHealthy(): Promise<boolean> {
    const healthResponse = await this.checkHealth();
    return healthResponse.status === 'ok';
  }

  /**
   * Gets a summary of service statuses.
   * @returns Promise<{ healthy: number; unhealthy: number; services: ServiceStatus[] }>
   */
  async getServiceSummary(): Promise<{
    healthy: number;
    unhealthy: number;
    services: ServiceStatus[];
  }> {
    const healthResponse = await this.checkHealth();
    const healthy = healthResponse.services.filter(
      s => s.status === 'ok',
    ).length;
    const unhealthy = healthResponse.services.filter(
      s => s.status === 'error',
    ).length;

    return {
      healthy,
      unhealthy,
      services: healthResponse.services,
    };
  }

  /**
   * Clears the cached health check results.
   * Useful when you want to force a fresh check.
   */
  clearCache(): void {
    this.cache = { data: null, timestamp: 0 };
  }

  /**
   * Gets detailed error information for unhealthy services.
   * @returns Promise<string[]>
   */
  async getErrorDetails(): Promise<string[]> {
    const healthResponse = await this.checkHealth();
    return healthResponse.services
      .filter(s => s.status === 'error')
      .map(s => `${s.service}: ${s.message || 'Unknown error'}`);
  }

  /**
   * Performs a quick health check with timeout.
   * Useful for startup checks where you don't want to wait too long.
   * @param timeoutMs - Timeout in milliseconds (default: 5000)
   * @returns Promise<HealthCheckResponse | null>
   */
  async quickCheck(
    timeoutMs: number = 5000,
  ): Promise<HealthCheckResponse | null> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), timeoutMs);
      });

      const healthCheckPromise = this.checkHealth(false); // Don't use cache for quick checks

      return await Promise.race([healthCheckPromise, timeoutPromise]);
    } catch (error) {
      console.warn('Quick health check failed:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const healthCheckService = new HealthCheckService();

// Export the class for testing purposes
export { HealthCheckService };
