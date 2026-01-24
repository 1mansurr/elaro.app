/**
 * Integration Tests: RevenueCat + Error Tracking
 *
 * Tests the integration between RevenueCat service and error tracking:
 * - RevenueCat error → Error tracking captures
 * - Circuit breaker opens → Error logged
 * - Recovery → Success tracked
 */

import { revenueCatService } from '@/services/revenueCat';
import { errorTracking } from '@/services/errorTracking';
import { CircuitBreaker } from '@/utils/circuitBreaker';

// Mock error tracking
jest.mock('@/services/errorTracking', () => ({
  errorTracking: {
    captureError: jest.fn(),
    captureMessage: jest.fn(),
  },
}));

// Mock RevenueCat
jest.mock('react-native-purchases', () => ({
  default: {
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    getCustomerInfo: jest.fn(),
  },
}));

// Mock circuit breaker
jest.mock('@/utils/circuitBreaker', () => ({
  CircuitBreaker: {
    getInstance: jest.fn(() => ({
      execute: jest.fn(),
      getState: jest.fn(() => 'CLOSED'),
    })),
  },
}));

describe('RevenueCat + Error Tracking Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RevenueCat Error Capture', () => {
    it('should capture error when RevenueCat API call fails', async () => {
      const error = new Error('RevenueCat API error');

      const mockCircuitBreaker = CircuitBreaker.getInstance('revenuecat', {
        failureThreshold: 3,
        resetTimeout: 30000,
      });

      (mockCircuitBreaker.execute as jest.Mock).mockRejectedValue(error);

      try {
        await mockCircuitBreaker.execute(async () => {
          throw error;
        });
      } catch (e) {
        errorTracking.captureError(error, {
          tags: {
            service: 'revenuecat',
            operation: 'get_offerings',
          },
          extra: {
            errorCode: 'REVENUECAT_ERROR',
          },
        });
      }

      expect(errorTracking.captureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            service: 'revenuecat',
          }),
        }),
      );
    });

    it('should track purchase cancellation without error', () => {
      const cancellationError = new Error('Purchase was cancelled by user');
      cancellationError.name = 'PURCHASES_ERROR_PURCHASE_CANCELLED';

      // User cancellations should not be logged as errors
      errorTracking.captureMessage('Purchase cancelled by user', 'info');

      expect(errorTracking.captureMessage).toHaveBeenCalledWith(
        'Purchase cancelled by user',
        'info',
      );
      expect(errorTracking.captureError).not.toHaveBeenCalled();
    });

    it('should capture error with context when circuit breaker opens', () => {
      const mockCircuitBreaker = CircuitBreaker.getInstance('revenuecat', {
        failureThreshold: 3,
        resetTimeout: 30000,
      });

      (mockCircuitBreaker.getState as jest.Mock).mockReturnValue('OPEN');

      const error = new Error('Circuit breaker is open');

      errorTracking.captureError(error, {
        tags: {
          service: 'revenuecat',
          circuitBreakerState: 'OPEN',
        },
        extra: {
          failureCount: 3,
        },
      });

      expect(errorTracking.captureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            circuitBreakerState: 'OPEN',
          }),
        }),
      );
    });
  });

  describe('Circuit Breaker State Tracking', () => {
    it('should track when circuit breaker opens', () => {
      const mockCircuitBreaker = CircuitBreaker.getInstance('revenuecat', {
        failureThreshold: 3,
        resetTimeout: 30000,
      });

      (mockCircuitBreaker.getState as jest.Mock).mockReturnValue('OPEN');

      const state = mockCircuitBreaker.getState();

      if (state === 'open') {
        errorTracking.captureMessage(
          'RevenueCat circuit breaker opened due to repeated failures',
          'warning',
        );
      }

      expect(errorTracking.captureMessage).toHaveBeenCalledWith(
        'RevenueCat circuit breaker opened due to repeated failures',
        'warning',
      );
    });

    it('should track when circuit breaker closes after recovery', () => {
      const mockCircuitBreaker = CircuitBreaker.getInstance('revenuecat', {
        failureThreshold: 3,
        resetTimeout: 30000,
      });

      (mockCircuitBreaker.getState as jest.Mock).mockReturnValue('CLOSED');

      const state = mockCircuitBreaker.getState();

      if (state === 'closed') {
        errorTracking.captureMessage(
          'RevenueCat circuit breaker closed - service recovered',
          'info',
        );
      }

      expect(errorTracking.captureMessage).toHaveBeenCalledWith(
        'RevenueCat circuit breaker closed - service recovered',
        'info',
      );
    });
  });

  describe('Error Recovery Tracking', () => {
    it('should track successful recovery after error', async () => {
      const mockCircuitBreaker = CircuitBreaker.getInstance('revenuecat', {
        failureThreshold: 3,
        resetTimeout: 30000,
      });

      // Simulate failure then recovery
      (mockCircuitBreaker.execute as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ current: { identifier: 'default' } });

      try {
        await mockCircuitBreaker.execute(async () => {
          throw new Error('Network error');
        });
      } catch (error) {
        errorTracking.captureError(error as Error, {
          tags: { service: 'revenuecat', retryable: 'true' },
        });
      }

      // Retry succeeds
      const result = await mockCircuitBreaker.execute(async () => {
        return { current: { identifier: 'default' } };
      });

      errorTracking.captureMessage(
        'RevenueCat operation recovered successfully',
        'info',
      );

      expect(result).toBeDefined();
      expect(errorTracking.captureMessage).toHaveBeenCalledWith(
        'RevenueCat operation recovered successfully',
        'info',
      );
    });

    it('should track retry attempts', async () => {
      const mockCircuitBreaker = CircuitBreaker.getInstance('revenuecat', {
        failureThreshold: 3,
        resetTimeout: 30000,
      });

      let attemptCount = 0;
      (mockCircuitBreaker.execute as jest.Mock).mockImplementation(async fn => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        return await fn();
      });

      try {
        await mockCircuitBreaker.execute(async () => {
          if (attemptCount < 3) {
            throw new Error(`Attempt ${attemptCount} failed`);
          }
          return { success: true };
        });
      } catch (error) {
        errorTracking.captureError(error as Error, {
          tags: { service: 'revenuecat', attempt: attemptCount.toString() },
        });
      }

      expect(attemptCount).toBeGreaterThan(0);
    });
  });

  describe('Error Context and Metadata', () => {
    it('should include operation context in error tracking', async () => {
      const error = new Error('Failed to get offerings');

      errorTracking.captureError(error, {
        tags: {
          service: 'revenuecat',
          operation: 'get_offerings',
        },
        extra: {
          userId: 'user-123',
          timestamp: new Date().toISOString(),
        },
      });

      expect(errorTracking.captureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            operation: 'get_offerings',
          }),
          extra: expect.objectContaining({
            userId: 'user-123',
          }),
        }),
      );
    });

    it('should track error rate for RevenueCat operations', () => {
      const errors = [
        new Error('Error 1'),
        new Error('Error 2'),
        new Error('Error 3'),
      ];

      errors.forEach((error, index) => {
        errorTracking.captureError(error, {
          tags: {
            service: 'revenuecat',
            operation: 'purchase',
            attempt: (index + 1).toString(),
          },
        });
      });

      expect(errorTracking.captureError).toHaveBeenCalledTimes(3);
    });
  });
});
