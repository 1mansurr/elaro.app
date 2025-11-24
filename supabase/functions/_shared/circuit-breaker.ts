/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by "opening" the circuit after
 * a threshold of failures, allowing the system to recover.
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of failures before opening (default: 5)
  resetTimeout?: number; // Time before attempting recovery (default: 60000ms)
  monitorInterval?: number; // Interval to check state (default: 10000ms)
}

export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: CircuitState = 'CLOSED';
  private successCount: number = 0;

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {},
  ) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeout: options.resetTimeout ?? 60000, // 1 minute
      monitorInterval: options.monitorInterval ?? 10000, // 10 seconds
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.options.resetTimeout!) {
        console.log(
          `🔄 Circuit breaker [${this.name}]: Transitioning to HALF_OPEN`,
        );
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        const remainingTime = Math.ceil(
          (this.options.resetTimeout! - timeSinceLastFailure) / 1000,
        );
        throw new Error(
          `Circuit breaker [${this.name}] is OPEN. Service temporarily unavailable. Retry in ${remainingTime} seconds.`,
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
   * Handle successful execution
   */
  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;

      // After 3 consecutive successes in HALF_OPEN, close the circuit
      if (this.successCount >= 3) {
        console.log(
          `✅ Circuit breaker [${this.name}]: Transitioning to CLOSED (recovered)`,
        );
        this.state = 'CLOSED';
        this.failures = 0;
        this.successCount = 0;
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in CLOSED state
      this.failures = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN state reopens the circuit
      console.log(
        `⚠️ Circuit breaker [${this.name}]: Failure in HALF_OPEN, reopening circuit`,
      );
      this.state = 'OPEN';
      this.successCount = 0;
    } else if (
      this.state === 'CLOSED' &&
      this.failures >= this.options.failureThreshold!
    ) {
      console.log(
        `🔴 Circuit breaker [${this.name}]: OPENING after ${this.failures} consecutive failures`,
      );
      this.state = 'OPEN';
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit stats
   */
  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Manually reset the circuit (force to CLOSED)
   */
  reset(): void {
    console.log(`🔄 Circuit breaker [${this.name}]: Manual reset to CLOSED`);
    this.state = 'CLOSED';
    this.failures = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

// Global circuit breakers for common external services
export const circuitBreakers = {
  revenueCat: new CircuitBreaker('RevenueCat', {
    failureThreshold: 3,
    resetTimeout: 30000,
  }),
  expo: new CircuitBreaker('Expo', {
    failureThreshold: 3,
    resetTimeout: 30000,
  }),
  paystack: new CircuitBreaker('Paystack', {
    failureThreshold: 3,
    resetTimeout: 30000,
  }),
};
