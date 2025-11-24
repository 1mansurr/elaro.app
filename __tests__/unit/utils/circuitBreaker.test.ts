import { CircuitBreaker } from '@/utils/circuitBreaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    // Reset all circuit breaker instances
    jest.clearAllMocks();
  });

  describe('Circuit States', () => {
    it('should start in CLOSED state', () => {
      const breaker = CircuitBreaker.getInstance('test-endpoint');

      expect(breaker.getState()).toBe('closed');
    });

    it('should transition to OPEN after failure threshold', async () => {
      // Use a unique endpoint name to avoid conflicts with other tests
      const breaker = CircuitBreaker.getInstance('test-endpoint-open-unique', {
        failureThreshold: 3,
      });

      // Reset to ensure clean state
      breaker.reset();

      // Cause 3 failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('open');
    });

    it('should reject requests when OPEN', async () => {
      const breaker = CircuitBreaker.getInstance('test-open', {
        failureThreshold: 1,
      });

      // Cause failure to open circuit
      try {
        await breaker.execute(async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        // Expected
      }

      // Try to execute again - should be rejected
      await expect(breaker.execute(async () => 'success')).rejects.toThrow(
        'Circuit breaker is open',
      );
    });

    it('should transition to HALF-OPEN after reset timeout', async () => {
      jest.useFakeTimers();

      const breaker = CircuitBreaker.getInstance('test-half-open', {
        failureThreshold: 1,
        resetTimeout: 1000,
      });

      // Open circuit
      try {
        await breaker.execute(async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        // Expected
      }

      expect(breaker.getState()).toBe('open');

      // Fast forward time
      jest.advanceTimersByTime(1001);

      // Try to execute - should transition to half-open
      const executePromise = breaker.execute(async () => 'success');

      // Should be in half-open state
      expect(breaker.getState()).toBe('half-open');

      await executePromise;

      jest.useRealTimers();
    });

    it('should close circuit after success threshold in HALF-OPEN', async () => {
      jest.useFakeTimers();

      const breaker = CircuitBreaker.getInstance('test-recovery', {
        failureThreshold: 1,
        successThreshold: 2,
        resetTimeout: 100,
      });

      // Open circuit
      try {
        await breaker.execute(async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        // Expected
      }

      // Wait for reset timeout
      jest.advanceTimersByTime(150);

      // Execute 2 successful requests
      await breaker.execute(async () => 'success1');
      await breaker.execute(async () => 'success2');

      expect(breaker.getState()).toBe('closed');

      jest.useRealTimers();
    });
  });

  describe('Execute Function', () => {
    it('should execute function successfully in CLOSED state', async () => {
      const breaker = CircuitBreaker.getInstance('test-execute');

      const result = await breaker.execute(async () => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(breaker.getState()).toBe('closed');
    });

    it('should propagate errors from function', async () => {
      const breaker = CircuitBreaker.getInstance('test-error');

      await expect(
        breaker.execute(async () => {
          throw new Error('Function error');
        }),
      ).rejects.toThrow('Function error');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance for same endpoint', () => {
      const breaker1 = CircuitBreaker.getInstance('same-endpoint');
      const breaker2 = CircuitBreaker.getInstance('same-endpoint');

      expect(breaker1).toBe(breaker2);
    });

    it('should return different instances for different endpoints', () => {
      const breaker1 = CircuitBreaker.getInstance('endpoint-1');
      const breaker2 = CircuitBreaker.getInstance('endpoint-2');

      expect(breaker1).not.toBe(breaker2);
    });
  });

  describe('Reset', () => {
    it('should reset circuit breaker to CLOSED state', async () => {
      const breaker = CircuitBreaker.getInstance('test-reset', {
        failureThreshold: 1,
      });

      // Open circuit
      try {
        await breaker.execute(async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        // Expected
      }

      expect(breaker.getState()).toBe('open');

      breaker.reset();

      expect(breaker.getState()).toBe('closed');
    });
  });

  describe('Statistics', () => {
    it('should return current statistics', () => {
      const breaker = CircuitBreaker.getInstance('test-stats');

      const stats = breaker.getStats();

      expect(stats).toHaveProperty('failures');
      expect(stats).toHaveProperty('successes');
      expect(stats).toHaveProperty('state');
    });
  });
});
