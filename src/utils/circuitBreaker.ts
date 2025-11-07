/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by temporarily stopping requests to failing services.
 * Automatically recovers when the service becomes healthy again.
 */

interface CircuitBreakerConfig {
  failureThreshold: number; // Open after N failures
  successThreshold: number; // Close after N successes
  timeout: number; // Time to wait before retry
  resetTimeout: number; // Time before attempting to close
}

interface EndpointStats {
  failures: number;
  successes: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

/**
 * Circuit Breaker Class
 *
 * Monitors endpoint health and prevents requests when endpoint is failing.
 * Three states:
 * - CLOSED: Normal operation, requests allowed
 * - OPEN: Endpoint is failing, requests blocked
 * - HALF-OPEN: Testing if endpoint recovered, limited requests allowed
 */
export class CircuitBreaker {
  private static instances: Map<string, CircuitBreaker> = new Map();
  private stats: EndpointStats;
  private config: CircuitBreakerConfig;

  private constructor(
    private endpoint: string,
    config?: Partial<CircuitBreakerConfig>,
  ) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 60 seconds
      resetTimeout: 30000, // 30 seconds
      ...config,
    };

    this.stats = {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      state: 'closed',
    };
  }

  /**
   * Get or create a circuit breaker instance for an endpoint
   */
  static getInstance(
    endpoint: string,
    config?: Partial<CircuitBreakerConfig>,
  ): CircuitBreaker {
    if (!CircuitBreaker.instances.has(endpoint)) {
      CircuitBreaker.instances.set(
        endpoint,
        new CircuitBreaker(endpoint, config),
      );
    } else if (config) {
      // Update config if provided and instance exists
      const instance = CircuitBreaker.instances.get(endpoint)!;
      instance.config = {
        ...instance.config,
        ...config,
      };
      // Reset stats if config changed
      instance.reset();
    }
    return CircuitBreaker.instances.get(endpoint)!;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.stats.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.stats.lastFailureTime;

      if (timeSinceLastFailure > this.config.resetTimeout) {
        // Try half-open state
        this.stats.state = 'half-open';
        this.stats.successes = 0;
        console.log(
          `🟡 Circuit breaker for ${this.endpoint} entering HALF-OPEN state`,
        );
      } else {
        const remainingTime = this.config.resetTimeout - timeSinceLastFailure;
        throw new Error(
          `Circuit breaker is open for ${this.endpoint}. Please try again in ${Math.ceil(remainingTime / 1000)} seconds.`,
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.stats.successes++;
    this.stats.failures = 0;

    if (
      this.stats.state === 'half-open' &&
      this.stats.successes >= this.config.successThreshold
    ) {
      this.stats.state = 'closed';
      console.log(
        `✅ Circuit breaker for ${this.endpoint} is now CLOSED (healthy)`,
      );
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.stats.failures++;
    this.stats.successes = 0;
    this.stats.lastFailureTime = Date.now();

    if (this.stats.failures >= this.config.failureThreshold) {
      this.stats.state = 'open';
      console.error(
        `🔴 Circuit breaker for ${this.endpoint} is now OPEN (failing)`,
      );
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): 'closed' | 'open' | 'half-open' {
    return this.stats.state;
  }

  /**
   * Get current statistics
   */
  getStats(): EndpointStats {
    return { ...this.stats };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.stats = {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      state: 'closed',
    };
    console.log(`🔄 Circuit breaker for ${this.endpoint} has been reset`);
  }

  /**
   * Manually open the circuit breaker
   */
  open(): void {
    this.stats.state = 'open';
    this.stats.lastFailureTime = Date.now();
    console.log(`🔴 Circuit breaker for ${this.endpoint} manually opened`);
  }
}
