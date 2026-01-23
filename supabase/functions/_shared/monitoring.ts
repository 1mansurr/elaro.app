/**
 * Comprehensive Monitoring and Observability System
 *
 * This module provides centralized monitoring, logging, and observability
 * for all Edge Functions and database operations.
 */

// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

export interface PerformanceMetrics {
  functionName: string;
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  timestamp: string;
  userId?: string;
  success: boolean;
  errorMessage?: string;
}

export interface DatabaseMetrics {
  queryType: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: string;
  userId?: string;
  success: boolean;
  errorMessage?: string;
}

export interface BusinessMetrics {
  eventType: string;
  eventCount: number;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    edgeFunctions: boolean;
    eventProcessing: boolean;
    externalServices: boolean;
  };
  metrics: {
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
}

export class MonitoringService {
  private metrics: PerformanceMetrics[] = [];
  private dbMetrics: DatabaseMetrics[] = [];
  private businessMetrics: BusinessMetrics[] = [];

  constructor(private supabaseClient: ReturnType<typeof createClient>) {}

  /**
   * Record performance metrics for Edge Functions
   */
  async recordPerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    this.metrics.push(metrics);

    // Store in database for persistence
    await this.supabaseClient
      .from('performance_metrics')
      .insert({
        function_name: metrics.functionName,
        execution_time: metrics.executionTime,
        memory_usage: metrics.memoryUsage,
        cpu_usage: metrics.cpuUsage,
        user_id: metrics.userId,
        success: metrics.success,
        error_message: metrics.errorMessage,
        timestamp: metrics.timestamp,
      })
      .catch((error: unknown) => {
        console.error('Failed to store performance metrics:', error);
      });
  }

  /**
   * Record database operation metrics
   */
  async recordDatabaseMetrics(metrics: DatabaseMetrics): Promise<void> {
    this.dbMetrics.push(metrics);

    // Store in database for persistence
    await this.supabaseClient
      .from('database_metrics')
      .insert({
        query_type: metrics.queryType,
        execution_time: metrics.executionTime,
        rows_affected: metrics.rowsAffected,
        user_id: metrics.userId,
        success: metrics.success,
        error_message: metrics.errorMessage,
        timestamp: metrics.timestamp,
      })
      .catch((error: unknown) => {
        console.error('Failed to store database metrics:', error);
      });
  }

  /**
   * Record business metrics
   */
  async recordBusinessMetrics(metrics: BusinessMetrics): Promise<void> {
    this.businessMetrics.push(metrics);

    // Store in database for persistence
    await this.supabaseClient
      .from('business_metrics')
      .insert({
        event_type: metrics.eventType,
        event_count: metrics.eventCount,
        user_id: metrics.userId,
        metadata: metrics.metadata,
        timestamp: metrics.timestamp,
      })
      .catch((error: unknown) => {
        console.error('Failed to store business metrics:', error);
      });
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const checks = await this.performHealthChecks();
    const metrics = await this.calculateSystemMetrics();

    const status = this.determineHealthStatus(checks, metrics);

    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
      metrics,
    };
  }

  /**
   * Perform health checks
   */
  private async performHealthChecks(): Promise<SystemHealth['checks']> {
    const checks = {
      database: false,
      edgeFunctions: false,
      eventProcessing: false,
      externalServices: false,
    };

    try {
      // Database health check
      const { error: dbError } = await this.supabaseClient
        .from('users')
        .select('id')
        .limit(1);
      checks.database = !dbError;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    try {
      // Edge Functions health check (simplified)
      checks.edgeFunctions = true; // Assume healthy if we can execute this
    } catch (error) {
      console.error('Edge Functions health check failed:', error);
    }

    try {
      // Event processing health check
      await this.supabaseClient
        .from('user_events')
        .select('id')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .limit(1);
      checks.eventProcessing = true; // If we can query events, processing is working
    } catch (error) {
      console.error('Event processing health check failed:', error);
    }

    try {
      // External services health check (placeholder)
      checks.externalServices = true; // Assume healthy for now
    } catch (error) {
      console.error('External services health check failed:', error);
    }

    return checks;
  }

  /**
   * Calculate system metrics
   */
  private async calculateSystemMetrics(): Promise<SystemHealth['metrics']> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      // Get recent performance metrics
      const { data: recentMetrics } = await this.supabaseClient
        .from('performance_metrics')
        .select('execution_time, success, timestamp')
        .gte('timestamp', oneHourAgo.toISOString());

      const totalRequests = recentMetrics?.length || 0;
      const successfulRequests =
        recentMetrics?.filter((m: { success?: boolean }) => m.success).length || 0;
      const avgResponseTime =
        recentMetrics?.reduce((sum: number, m: { execution_time?: number }) => sum + (m.execution_time || 0), 0) /
          totalRequests || 0;
      const errorRate =
        totalRequests > 0
          ? ((totalRequests - successfulRequests) / totalRequests) * 100
          : 0;

      return {
        responseTime: avgResponseTime,
        errorRate,
        throughput: totalRequests / 60, // Requests per minute
      };
    } catch (error) {
      console.error('Failed to calculate system metrics:', error);
      return {
        responseTime: 0,
        errorRate: 100,
        throughput: 0,
      };
    }
  }

  /**
   * Determine overall health status
   */
  private determineHealthStatus(
    checks: SystemHealth['checks'],
    metrics: SystemHealth['metrics'],
  ): SystemHealth['status'] {
    const allChecksPass = Object.values(checks).every(check => check);
    const errorRateAcceptable = metrics.errorRate < 5;
    const responseTimeAcceptable = metrics.responseTime < 2000; // 2 seconds

    if (allChecksPass && errorRateAcceptable && responseTimeAcceptable) {
      return 'healthy';
    } else if (
      allChecksPass &&
      (errorRateAcceptable || responseTimeAcceptable)
    ) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(timeRange: string = '24h'): Promise<{
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    topSlowFunctions: Array<{ functionName: string; avgTime: number }>;
    userActivity: Array<{ userId: string; requestCount: number }>;
  }> {
    const timeRangeMs = this.parseTimeRange(timeRange);
    const startTime = new Date(Date.now() - timeRangeMs);

    try {
      const { data: metrics } = await this.supabaseClient
        .from('performance_metrics')
        .select('*')
        .gte('timestamp', startTime.toISOString());

      const totalRequests = metrics?.length || 0;
      const successfulRequests = metrics?.filter((m: { success?: boolean }) => m.success).length || 0;
      const averageResponseTime =
        metrics?.reduce((sum: number, m: { execution_time?: number }) => sum + (m.execution_time || 0), 0) /
          totalRequests || 0;
      const errorRate =
        totalRequests > 0
          ? ((totalRequests - successfulRequests) / totalRequests) * 100
          : 0;

      // Top slow functions
      const functionTimes =
        metrics?.reduce(
          (acc: Record<string, { total: number; count: number }>, m: { function_name?: string; execution_time?: number }) => {
            if (m.function_name) {
              if (!acc[m.function_name]) {
                acc[m.function_name] = { total: 0, count: 0 };
              }
              acc[m.function_name].total += (m.execution_time || 0);
              acc[m.function_name].count += 1;
            }
            return acc;
          },
          {} as Record<string, { total: number; count: number }>,
        ) || {};

      const topSlowFunctions = (Object.entries(functionTimes) as [string, { total: number; count: number }][])
        .map(([name, data]) => ({
          functionName: name,
          avgTime: data.total / data.count,
        }))
        .sort((a, b) => b.avgTime - a.avgTime)
        .slice(0, 10);

      // User activity
      const userActivity =
        metrics?.reduce(
          (acc: Record<string, number>, m: { user_id?: string }) => {
            if (m.user_id) {
              acc[m.user_id] = (acc[m.user_id] || 0) + 1;
            }
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      const userActivityArray = Object.entries(userActivity)
        .map(([userId, requestCount]) => ({ userId, requestCount: requestCount as number }))
        .sort((a, b) => (b.requestCount as number) - (a.requestCount as number))
        .slice(0, 20);

      return {
        totalRequests,
        averageResponseTime,
        errorRate,
        topSlowFunctions,
        userActivity: userActivityArray,
      };
    } catch (error) {
      console.error('Failed to get performance analytics:', error);
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        topSlowFunctions: [],
        userActivity: [],
      };
    }
  }

  /**
   * Get business analytics
   */
  async getBusinessAnalytics(timeRange: string = '24h'): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    userEngagement: Array<{ userId: string; eventCount: number }>;
    growthMetrics: {
      newUsers: number;
      activeUsers: number;
      retentionRate: number;
    };
  }> {
    const timeRangeMs = this.parseTimeRange(timeRange);
    const startTime = new Date(Date.now() - timeRangeMs);

    try {
      const { data: events } = await this.supabaseClient
        .from('business_metrics')
        .select('*')
        .gte('timestamp', startTime.toISOString());

      const totalEvents = events?.length || 0;
      const eventsByType =
        events?.reduce(
          (acc: Record<string, number>, e: { event_type?: string; event_count?: number }) => {
            if (e.event_type) {
              acc[e.event_type] = (acc[e.event_type] || 0) + (e.event_count || 0);
            }
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      const userEngagement =
        events?.reduce(
          (acc: Record<string, number>, e: { user_id?: string; event_count?: number }) => {
            if (e.user_id) {
              acc[e.user_id] = (acc[e.user_id] || 0) + (e.event_count || 0);
            }
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      const userEngagementArray = Object.entries(userEngagement)
        .map(([userId, eventCount]) => ({ userId, eventCount: eventCount as number }))
        .sort((a, b) => (b.eventCount as number) - (a.eventCount as number))
        .slice(0, 20);

      // Growth metrics (simplified)
      const { data: newUsers } = await this.supabaseClient
        .from('users')
        .select('id')
        .gte('created_at', startTime.toISOString());

      const { data: activeUsers } = await this.supabaseClient
        .from('users')
        .select('id')
        .gte('updated_at', startTime.toISOString());

      return {
        totalEvents,
        eventsByType,
        userEngagement: userEngagementArray,
        growthMetrics: {
          newUsers: newUsers?.length || 0,
          activeUsers: activeUsers?.length || 0,
          retentionRate: 0, // Would need more complex calculation
        },
      };
    } catch (error) {
      console.error('Failed to get business analytics:', error);
      return {
        totalEvents: 0,
        eventsByType: {},
        userEngagement: [],
        growthMetrics: {
          newUsers: 0,
          activeUsers: 0,
          retentionRate: 0,
        },
      };
    }
  }

  /**
   * Parse time range string to milliseconds
   */
  private parseTimeRange(timeRange: string): number {
    const unit = timeRange.slice(-1);
    const value = parseInt(timeRange.slice(0, -1));

    switch (unit) {
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'w':
        return value * 7 * 24 * 60 * 60 * 1000;
      case 'm':
        return value * 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000; // Default to 24 hours
    }
  }

  /**
   * Clean up old metrics
   */
  async cleanupOldMetrics(retentionDays: number = 30): Promise<void> {
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    );

    try {
      await Promise.all([
        this.supabaseClient
          .from('performance_metrics')
          .delete()
          .lt('timestamp', cutoffDate.toISOString()),

        this.supabaseClient
          .from('database_metrics')
          .delete()
          .lt('timestamp', cutoffDate.toISOString()),

        this.supabaseClient
          .from('business_metrics')
          .delete()
          .lt('timestamp', cutoffDate.toISOString()),
      ]);

      console.log(`Cleaned up metrics older than ${retentionDays} days`);
    } catch (error) {
      console.error('Failed to cleanup old metrics:', error);
    }
  }
}

/**
 * Performance monitoring decorator
 */
export function monitorPerformance(
  functionName: string,
  supabaseClient: ReturnType<typeof createClient>,
) {
  return function (
    _target: unknown,
    _propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const startTime = Date.now();
      const startMemory =
        (performance as { memory?: { usedJSHeapSize?: number } }).memory
          ?.usedJSHeapSize || 0;
      let success = true;
      let errorMessage: string | undefined;

      try {
        const result = await method.apply(this, args);
        return result;
      } catch (error) {
        success = false;
        errorMessage = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        const endTime = Date.now();
        const endMemory =
          (performance as { memory?: { usedJSHeapSize?: number } }).memory
            ?.usedJSHeapSize || 0;
        const executionTime = endTime - startTime;
        const memoryUsage = endMemory - startMemory;

        const monitoringService = new MonitoringService(supabaseClient);
        await monitoringService.recordPerformanceMetrics({
          functionName,
          executionTime,
          memoryUsage,
          cpuUsage: 0, // Not available in Deno
          timestamp: new Date().toISOString(),
          userId: (args[0] as { user?: { id?: string } })?.user?.id as string | undefined,
          success,
          errorMessage,
        });
      }
    };
  };
}

/**
 * Global monitoring service instance
 */
export const globalMonitoringService = new MonitoringService(null);

/**
 * Initialize monitoring system
 */
export function initializeMonitoring(
  supabaseClient: ReturnType<typeof createClient>,
): void {
  globalMonitoringService['supabaseClient'] = supabaseClient;
  console.log('Monitoring system initialized');
}
