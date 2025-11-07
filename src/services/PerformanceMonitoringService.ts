/**
 * Performance monitoring service
 *
 * This service provides comprehensive performance monitoring including:
 * - Timer-based performance measurement
 * - Memory usage tracking
 * - Render performance monitoring
 * - Network request timing
 * - Custom metrics collection
 */
class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metrics: Map<string, number> = new Map();
  private timers: Map<string, number> = new Map();
  private memorySnapshots: Map<string, number> = new Map();
  private renderTimes: Map<string, number[]> = new Map();
  private networkTimings: Map<string, number> = new Map();

  public static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance =
        new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * Start performance timer
   * @param label - Unique label for the timer
   */
  public startTimer(label: string): void {
    this.timers.set(label, Date.now());
    console.log(`⏱️ Timer started: ${label}`);
  }

  /**
   * End performance timer and record metric
   * @param label - Label of the timer to end
   * @returns Duration in milliseconds
   */
  public endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`⚠️ Timer ${label} was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.metrics.set(label, duration);
    this.timers.delete(label);

    console.log(`⏱️ Timer ended: ${label} took ${duration}ms`);
    return duration;
  }

  /**
   * Measure async operation performance
   * @param label - Label for the operation
   * @param operation - Async operation to measure
   * @returns Promise that resolves to the operation result
   */
  public async measureAsync<T>(
    label: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    this.startTimer(label);
    try {
      const result = await operation();
      this.endTimer(label);
      return result;
    } catch (error) {
      this.endTimer(label);
      throw error;
    }
  }

  /**
   * Measure synchronous operation performance
   * @param label - Label for the operation
   * @param operation - Synchronous operation to measure
   * @returns Result of the operation
   */
  public measureSync<T>(label: string, operation: () => T): T {
    this.startTimer(label);
    try {
      const result = operation();
      this.endTimer(label);
      return result;
    } catch (error) {
      this.endTimer(label);
      throw error;
    }
  }

  /**
   * Record custom metric
   * @param label - Label for the metric
   * @param value - Value to record
   */
  public recordMetric(label: string, value: number): void {
    this.metrics.set(label, value);
    console.log(`📊 Metric recorded: ${label} = ${value}`);
  }

  /**
   * Record memory usage snapshot
   * @param label - Label for the memory snapshot
   */
  public recordMemorySnapshot(label: string): void {
    // Note: In React Native, we can't directly access memory usage
    // This is a placeholder for future implementation
    const timestamp = Date.now();
    this.memorySnapshots.set(`${label}-${timestamp}`, timestamp);
    console.log(`🧠 Memory snapshot recorded: ${label}`);
  }

  /**
   * Record render time for components
   * @param componentName - Name of the component
   * @param renderTime - Time taken to render in milliseconds
   */
  public recordRenderTime(componentName: string, renderTime: number): void {
    if (!this.renderTimes.has(componentName)) {
      this.renderTimes.set(componentName, []);
    }

    const times = this.renderTimes.get(componentName)!;
    times.push(renderTime);

    // Keep only last 10 render times
    if (times.length > 10) {
      times.shift();
    }

    console.log(`🎨 Render time recorded: ${componentName} = ${renderTime}ms`);
  }

  /**
   * Record network request timing
   * @param url - URL of the request
   * @param duration - Duration in milliseconds
   */
  public recordNetworkTiming(url: string, duration: number): void {
    this.networkTimings.set(url, duration);
    console.log(`🌐 Network timing recorded: ${url} = ${duration}ms`);
  }

  /**
   * Get all metrics
   * @returns Object containing all recorded metrics
   */
  public getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Get render performance statistics
   * @param componentName - Name of the component
   * @returns Render performance statistics
   */
  public getRenderStats(componentName: string): {
    average: number;
    min: number;
    max: number;
    count: number;
  } | null {
    const times = this.renderTimes.get(componentName);
    if (!times || times.length === 0) return null;

    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return {
      average: Math.round(average * 100) / 100,
      min,
      max,
      count: times.length,
    };
  }

  /**
   * Get network performance statistics
   * @returns Network performance statistics
   */
  public getNetworkStats(): {
    averageResponseTime: number;
    slowestRequest: { url: string; time: number };
    fastestRequest: { url: string; time: number };
    totalRequests: number;
  } {
    const timings = Array.from(this.networkTimings.entries());

    if (timings.length === 0) {
      return {
        averageResponseTime: 0,
        slowestRequest: { url: '', time: 0 },
        fastestRequest: { url: '', time: 0 },
        totalRequests: 0,
      };
    }

    const times = timings.map(([, time]) => time);
    const averageResponseTime =
      times.reduce((sum, time) => sum + time, 0) / times.length;

    const slowest = timings.reduce(
      (max, [url, time]) => (time > max.time ? { url, time } : max),
      { url: '', time: 0 },
    );

    const fastest = timings.reduce(
      (min, [url, time]) => (time < min.time ? { url, time } : min),
      { url: '', time: Infinity },
    );

    return {
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      slowestRequest: slowest,
      fastestRequest: fastest,
      totalRequests: timings.length,
    };
  }

  /**
   * Get performance summary
   * @returns Comprehensive performance summary
   */
  public getPerformanceSummary(): {
    metrics: Record<string, number>;
    renderStats: Record<string, any>;
    networkStats: any;
    activeTimers: string[];
  } {
    const renderStats: Record<string, any> = {};
    for (const [componentName] of this.renderTimes) {
      renderStats[componentName] = this.getRenderStats(componentName);
    }

    return {
      metrics: this.getMetrics(),
      renderStats,
      networkStats: this.getNetworkStats(),
      activeTimers: Array.from(this.timers.keys()),
    };
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    this.metrics.clear();
    this.timers.clear();
    this.memorySnapshots.clear();
    this.renderTimes.clear();
    this.networkTimings.clear();
    console.log('📊 All performance metrics cleared');
  }

  /**
   * Clear specific metric
   * @param label - Label of the metric to clear
   */
  public clearMetric(label: string): void {
    this.metrics.delete(label);
    console.log(`📊 Metric cleared: ${label}`);
  }

  /**
   * Export metrics as JSON
   * @returns JSON string of all metrics
   */
  public exportMetrics(): string {
    return JSON.stringify(this.getPerformanceSummary(), null, 2);
  }
}

export const performanceMonitoringService =
  PerformanceMonitoringService.getInstance();
