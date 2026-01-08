// Metrics collection using StatsD
// Uses lazy loading to prevent boot failures if StatsD module is unavailable

type StatsDConstructor = new (options: {
  host: string;
  port: number;
  prefix?: string;
}) => {
  increment: (metric: string, tags?: Record<string, string>) => void;
  timing: (
    metric: string,
    value: number,
    tags?: Record<string, string>,
  ) => void;
  gauge: (metric: string, value: number, tags?: Record<string, string>) => void;
  close: () => void;
};

// Lazy-load StatsD module to prevent boot failures
let StatsDModulePromise: Promise<unknown> | null = null;
let StatsDConstructor: StatsDConstructor | undefined = undefined;

async function loadStatsDModule(): Promise<StatsDConstructor | undefined> {
  if (StatsDConstructor !== undefined) {
    return StatsDConstructor;
  }

  if (!StatsDModulePromise) {
    StatsDModulePromise =
      import('https://deno.land/x/statsd@0.2.0/mod.ts').catch(error => {
        console.warn('StatsD module not available, metrics disabled:', error);
        return null;
      });
  }

  try {
    const StatsDModule = await StatsDModulePromise;
    if (!StatsDModule) {
      StatsDConstructor = undefined;
      return undefined;
    }

    // Try multiple export patterns
    StatsDConstructor =
      StatsDModule.default ||
      StatsDModule.StatsD ||
      (typeof StatsDModule === 'function' ? StatsDModule : undefined);

    return StatsDConstructor;
  } catch (error) {
    console.warn('Failed to load StatsD module:', error);
    StatsDConstructor = undefined;
    return undefined;
  }
}

// Initialize StatsD client
let statsdClient: ReturnType<StatsDConstructor> | null = null;

export async function getStatsDClient(): Promise<ReturnType<StatsDConstructor> | null> {
  if (statsdClient) {
    return statsdClient;
  }

  const metricsHost = Deno.env.get('METRICS_HOST');
  const metricsPort = Deno.env.get('METRICS_PORT');

  if (!metricsHost || !metricsPort) {
    console.warn(
      'Metrics not configured: METRICS_HOST and METRICS_PORT environment variables not set',
    );
    return null;
  }

  // Lazy-load the StatsD module
  const StatsD = await loadStatsDModule();
  if (!StatsD) {
    console.warn(
      'StatsD module does not expose a compatible constructor; metrics disabled',
    );
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
  private client: ReturnType<StatsDConstructor> | null = null;
  private clientPromise: Promise<ReturnType<StatsDConstructor> | null> | null =
    null;
  private startTime: number;
  private functionName: string;

  constructor(functionName: string) {
    // Start loading client asynchronously
    this.clientPromise = getStatsDClient().then(client => {
      this.client = client;
      return client;
    });
    this.startTime = Date.now();
    this.functionName = functionName;
  }

  private async ensureClient(): Promise<ReturnType<StatsDConstructor> | null> {
    if (this.client) return this.client;
    if (this.clientPromise) {
      await this.clientPromise;
      return this.client;
    }
    return null;
  }

  // Increment request counter
  incrementRequest(): void {
    // Fire and forget - don't await to avoid blocking
    this.ensureClient()
      .then(client => {
        if (!client) return;
        try {
          client.increment('api.requests.count', {
            function: this.functionName,
          });
        } catch (error) {
          console.error('Failed to send request count metric:', error);
        }
      })
      .catch(() => {
        // Ignore errors - metrics are optional
      });
  }

  // Record execution time
  recordExecutionTime(): void {
    // Fire and forget - don't await to avoid blocking
    this.ensureClient()
      .then(client => {
        if (!client) return;
        const duration = Date.now() - this.startTime;
        try {
          client.timing('api.execution_time', duration, {
            function: this.functionName,
          });
        } catch (error) {
          console.error('Failed to send execution time metric:', error);
        }
      })
      .catch(() => {
        // Ignore errors - metrics are optional
      });
  }

  // Increment status code counter
  incrementStatusCode(statusCode: number): void {
    // Fire and forget - don't await to avoid blocking
    this.ensureClient()
      .then(client => {
        if (!client) return;
        const statusCategory = Math.floor(statusCode / 100) * 100;
        try {
          // Increment specific status code counter
          client.increment(`api.status.${statusCode}.count`, {
            function: this.functionName,
          });
          // Increment status category counter (2xx, 3xx, 4xx, 5xx)
          client.increment(`api.status.${statusCategory}.count`, {
            function: this.functionName,
          });
        } catch (error) {
          console.error('Failed to send status code metric:', error);
        }
      })
      .catch(() => {
        // Ignore errors - metrics are optional
      });
  }

  // Record error
  recordError(errorType: string, _errorMessage: string): void {
    // Fire and forget - don't await to avoid blocking
    this.ensureClient()
      .then(client => {
        if (!client) return;
        try {
          client.increment('api.errors.count', {
            function: this.functionName,
            error_type: errorType,
          });
        } catch (error) {
          console.error('Failed to send error metric:', error);
        }
      })
      .catch(() => {
        // Ignore errors - metrics are optional
      });
  }

  // Record custom metric
  recordMetric(
    metricName: string,
    value: number,
    tags?: Record<string, string>,
  ): void {
    // Fire and forget - don't await to avoid blocking
    this.ensureClient()
      .then(client => {
        if (!client) return;
        try {
          client.gauge(metricName, value, {
            function: this.functionName,
            ...tags,
          });
        } catch (error) {
          console.error(`Failed to send metric ${metricName}:`, error);
        }
      })
      .catch(() => {
        // Ignore errors - metrics are optional
      });
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
