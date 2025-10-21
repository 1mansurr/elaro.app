import { StatsD } from 'https://deno.land/x/statsd@0.2.0/mod.ts';

// Initialize StatsD client
let statsdClient: StatsD | null = null;

export function getStatsDClient(): StatsD | null {
  if (statsdClient) {
    return statsdClient;
  }

  const metricsHost = Deno.env.get('METRICS_HOST');
  const metricsPort = Deno.env.get('METRICS_PORT');

  if (!metricsHost || !metricsPort) {
    console.warn('Metrics not configured: METRICS_HOST and METRICS_PORT environment variables not set');
    return null;
  }

  try {
    statsdClient = new StatsD({
      host: metricsHost,
      port: parseInt(metricsPort),
      prefix: 'elaro.',
    });
    console.log(`StatsD client initialized: ${metricsHost}:${metricsPort}`);
    return statsdClient;
  } catch (error) {
    console.error('Failed to initialize StatsD client:', error);
    return null;
  }
}

// Metric collection utilities
export class MetricsCollector {
  private client: StatsD | null;
  private startTime: number;
  private functionName: string;

  constructor(functionName: string) {
    this.client = getStatsDClient();
    this.startTime = Date.now();
    this.functionName = functionName;
  }

  // Increment request counter
  incrementRequest(): void {
    if (!this.client) return;
    
    try {
      this.client.increment('api.requests.count', {
        function: this.functionName,
      });
    } catch (error) {
      console.error('Failed to send request count metric:', error);
    }
  }

  // Record execution time
  recordExecutionTime(): void {
    if (!this.client) return;

    const duration = Date.now() - this.startTime;
    
    try {
      this.client.timing('api.execution_time', duration, {
        function: this.functionName,
      });
    } catch (error) {
      console.error('Failed to send execution time metric:', error);
    }
  }

  // Increment status code counter
  incrementStatusCode(statusCode: number): void {
    if (!this.client) return;

    const statusCategory = Math.floor(statusCode / 100) * 100;
    
    try {
      // Increment specific status code counter
      this.client.increment(`api.status.${statusCode}.count`, {
        function: this.functionName,
      });

      // Increment status category counter (2xx, 3xx, 4xx, 5xx)
      this.client.increment(`api.status.${statusCategory}.count`, {
        function: this.functionName,
      });
    } catch (error) {
      console.error('Failed to send status code metric:', error);
    }
  }

  // Record error
  recordError(errorType: string, errorMessage: string): void {
    if (!this.client) return;

    try {
      this.client.increment('api.errors.count', {
        function: this.functionName,
        error_type: errorType,
      });
    } catch (error) {
      console.error('Failed to send error metric:', error);
    }
  }

  // Record custom metric
  recordMetric(metricName: string, value: number, tags?: Record<string, string>): void {
    if (!this.client) return;

    try {
      this.client.gauge(metricName, value, {
        function: this.functionName,
        ...tags,
      });
    } catch (error) {
      console.error(`Failed to send metric ${metricName}:`, error);
    }
  }

  // Close the client (optional, for cleanup)
  close(): void {
    if (this.client) {
      try {
        this.client.close();
      } catch (error) {
        console.error('Failed to close StatsD client:', error);
      }
    }
  }
}

// Helper function to create a metrics collector
export function createMetricsCollector(functionName: string): MetricsCollector {
  return new MetricsCollector(functionName);
}

