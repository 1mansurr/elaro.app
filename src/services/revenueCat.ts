import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
} from 'react-native-purchases';
import { retryWithBackoff } from '@/utils/errorRecovery';
import { CircuitBreaker } from '@/utils/circuitBreaker';
import {
  withRateLimit,
  CLIENT_RATE_LIMITS,
  RateLimitError,
} from '@/utils/clientRateLimiter';

/**
 * Execute a promise with a timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
    ),
  ]);
}

/**
 * Default timeout for RevenueCat operations (10 seconds)
 */
const REVENUECAT_TIMEOUT = 10000;

/**
 * Check if a RevenueCat error is retryable
 */
interface RevenueCatError {
  code?: string;
  message?: string;
}

function isRetryableRevenueCatError(error: unknown): boolean {
  const err = error as RevenueCatError;
  // Don't retry user cancellations or invalid API keys
  if (error?.code === 'PURCHASES_ERROR_PURCHASE_CANCELLED') return false;
  if (error?.message?.includes('Invalid API key')) return false;
  if (error?.message?.includes('authentication failed')) return false;

  // Retry network errors and server errors
  return true;
}

export const revenueCatService = {
  /**
   * Initialize RevenueCat with API key
   * @returns {Promise<boolean>} True if initialization succeeded, false otherwise
   */
  initialize: async (apiKey: string): Promise<boolean> => {
    try {
      // Validate API key format
      if (!apiKey || apiKey.length < 10) {
        console.warn(
          '⚠️ RevenueCat API key is missing or invalid. Skipping initialization.',
        );
        return false;
      }

      await Purchases.configure({ apiKey });
      console.log('✅ RevenueCat initialized successfully');
      return true;
    } catch (error: unknown) {
      const err = error as { message?: string };
      // Handle specific RevenueCat errors gracefully
      if (err?.message?.includes('Invalid API key')) {
        console.error('❌ RevenueCat API key is invalid:', err.message);
      } else {
        console.error(
          '❌ RevenueCat initialization failed:',
          err?.message || error,
        );
      }
      // Don't throw - allow app to continue without RevenueCat
      return false;
    }
  },

  /**
   * Get current offerings from RevenueCat (direct implementation)
   * @internal Use getOfferings() for recovery support
   */
  getOfferingsDirect: async (): Promise<PurchasesOffering | null> => {
    try {
      const retryResult = await withRateLimit(
        'revenuecat_offerings',
        CLIENT_RATE_LIMITS.revenuecat_api,
        async () => {
          return await retryWithBackoff(
            async () => {
              return await CircuitBreaker.getInstance('revenuecat', {
                failureThreshold: 3,
                resetTimeout: 30000,
              }).execute(async () => {
                return await withTimeout(
                  Purchases.getOfferings(),
                  REVENUECAT_TIMEOUT,
                  'RevenueCat getOfferings timed out',
                );
              });
            },
            {
              maxRetries: 3,
              baseDelay: 1000,
              retryCondition: isRetryableRevenueCatError,
            },
          );
        },
      );

      // retryWithBackoff returns RetryResult, retryResult is a RetryResult here
      if (!retryResult.success) {
        if (retryResult.error instanceof RateLimitError) {
          console.warn(
            'Rate limit exceeded for RevenueCat offerings:',
            retryResult.error.message,
          );
          // Could return cached value here if available
        }
        console.error('Error fetching offerings:', retryResult.error);
        return null;
      }

      return retryResult.result.current;
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.warn(
          'Rate limit exceeded for RevenueCat offerings:',
          error.message,
        );
        // Could return cached value here if available
      }
      console.error('Error fetching offerings:', error);
      return null;
    }
  },

  /**
   * Get current offerings from RevenueCat
   * Uses recovery strategy with cached fallback
   */
  getOfferings: async (): Promise<PurchasesOffering | null> => {
    try {
      const { getOfferingsWithRecovery } = await import(
        '@/utils/revenueCatRecovery'
      );
      return await getOfferingsWithRecovery();
    } catch (error) {
      console.error('Error in getOfferings with recovery:', error);
      // Fallback to direct call if recovery utility fails
      return await revenueCatService.getOfferingsDirect();
    }
  },

  /**
   * Purchase a specific package
   */
  purchasePackage: async (
    packageToPurchase: PurchasesPackage,
  ): Promise<CustomerInfo> => {
    try {
      const retryResult = await withRateLimit(
        'revenuecat_purchase',
        CLIENT_RATE_LIMITS.revenuecat_api,
        async () => {
          return await retryWithBackoff(
            async () => {
              return await CircuitBreaker.getInstance('revenuecat', {
                failureThreshold: 3,
                resetTimeout: 30000,
              }).execute(async () => {
                const response = await withTimeout(
                  Purchases.purchasePackage(packageToPurchase),
                  REVENUECAT_TIMEOUT,
                  'RevenueCat purchasePackage timed out',
                );
                return response.customerInfo;
              });
            },
            {
              maxRetries: 2, // Lower retries for purchases (user-facing)
              baseDelay: 1000,
              retryCondition: isRetryableRevenueCatError,
            },
          );
        },
      );

      if (!retryResult.success) {
        if (retryResult.error instanceof RateLimitError) {
          throw new Error(`Rate limit exceeded. ${retryResult.error.message}`);
        }
        const error = retryResult.error as RevenueCatError;
        if (error?.code === 'PURCHASES_ERROR_PURCHASE_CANCELLED') {
          throw new Error('Purchase was cancelled by user');
        }
        throw new Error(
          `Purchase failed: ${error?.message || 'Unknown error'}`,
        );
      }

      console.log('Purchase successful:', retryResult.result);
      return retryResult.result;
    } catch (error: unknown) {
      if (error instanceof RateLimitError) {
        throw new Error(`Rate limit exceeded. ${error.message}`);
      }
      if (
        error instanceof Error &&
        error.message === 'Purchase was cancelled by user'
      ) {
        throw error;
      }
      const err = error as { message?: string };
      throw new Error(`Purchase failed: ${err?.message || 'Unknown error'}`);
    }
  },

  /**
   * Restore previous purchases
   */
  restorePurchases: async (): Promise<CustomerInfo> => {
    try {
      const retryResult = await withRateLimit(
        'revenuecat_restore',
        CLIENT_RATE_LIMITS.revenuecat_api,
        async () => {
          return await retryWithBackoff(
            async () => {
              return await CircuitBreaker.getInstance('revenuecat', {
                failureThreshold: 3,
                resetTimeout: 30000,
              }).execute(async () => {
                return await withTimeout(
                  Purchases.restorePurchases(),
                  REVENUECAT_TIMEOUT,
                  'RevenueCat restorePurchases timed out',
                );
              });
            },
            {
              maxRetries: 3,
              baseDelay: 1000,
              retryCondition: isRetryableRevenueCatError,
            },
          );
        },
      );

      if (!retryResult.success) {
        console.error('Error restoring purchases:', retryResult.error);
        throw retryResult.error;
      }

      console.log('Purchases restored successfully');
      return retryResult.result;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      throw error;
    }
  },

  /**
   * Get current customer information
   */
  getCustomerInfo: async (): Promise<CustomerInfo> => {
    try {
      const retryResult = await withRateLimit(
        'revenuecat_customer_info',
        CLIENT_RATE_LIMITS.revenuecat_api,
        async () => {
          return await retryWithBackoff(
            async () => {
              return await CircuitBreaker.getInstance('revenuecat', {
                failureThreshold: 3,
                resetTimeout: 30000,
              }).execute(async () => {
                return await withTimeout(
                  Purchases.getCustomerInfo(),
                  REVENUECAT_TIMEOUT,
                  'RevenueCat getCustomerInfo timed out',
                );
              });
            },
            {
              maxRetries: 3,
              baseDelay: 1000,
              retryCondition: isRetryableRevenueCatError,
            },
          );
        },
      );

      if (!retryResult.success) {
        console.error('Error getting customer info:', retryResult.error);
        throw retryResult.error;
      }

      return retryResult.result;
    } catch (error) {
      console.error('Error getting customer info:', error);
      throw error;
    }
  },

  /**
   * Check if user has any active subscription
   */
  hasActiveSubscription: (customerInfo: CustomerInfo): boolean => {
    return Object.keys(customerInfo.entitlements.active).length > 0;
  },

  /**
   * Get subscription tier based on active entitlements
   */
  getSubscriptionTier: (customerInfo: CustomerInfo): string => {
    if (customerInfo.entitlements.active['oddity']) {
      return 'oddity';
    }
    return 'free';
  },

  /**
   * Get subscription expiration date
   */
  getSubscriptionExpiration: (customerInfo: CustomerInfo): string | null => {
    const oddityEntitlement = customerInfo.entitlements.active['oddity'];
    if (oddityEntitlement) {
      return oddityEntitlement.expirationDate;
    }
    return null;
  },

  /**
   * Check if user is in trial period
   */
  isInTrial: (customerInfo: CustomerInfo): boolean => {
    const oddityEntitlement = customerInfo.entitlements.active['oddity'];
    // Check if the property exists before accessing it
    // RevenueCat EntitlementInfo may have isInIntroOfferPeriod property
    if (oddityEntitlement && 'isInIntroOfferPeriod' in oddityEntitlement) {
      return Boolean(
        (oddityEntitlement as { isInIntroOfferPeriod?: boolean })
          .isInIntroOfferPeriod,
      );
    }
    return false;
  },

  /**
   * Set user ID for RevenueCat (should match your backend user ID)
   */
  setUserId: async (userId: string): Promise<void> => {
    try {
      const retryResult = await retryWithBackoff(
        async () => {
          return await CircuitBreaker.getInstance('revenuecat', {
            failureThreshold: 3,
            resetTimeout: 30000,
          }).execute(async () => {
            return await withTimeout(
              Purchases.logIn(userId),
              REVENUECAT_TIMEOUT,
              'RevenueCat logIn timed out',
            );
          });
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          retryCondition: isRetryableRevenueCatError,
        },
      );

      if (!retryResult.success) {
        console.error('Error setting RevenueCat user ID:', retryResult.error);
        throw retryResult.error;
      }

      console.log('RevenueCat user ID set:', userId);
    } catch (error) {
      console.error('Error setting RevenueCat user ID:', error);
      throw error;
    }
  },

  /**
   * Log out current user
   */
  logOut: async (): Promise<CustomerInfo> => {
    try {
      const retryResult = await retryWithBackoff(
        async () => {
          return await CircuitBreaker.getInstance('revenuecat', {
            failureThreshold: 3,
            resetTimeout: 30000,
          }).execute(async () => {
            return await withTimeout(
              Purchases.logOut(),
              REVENUECAT_TIMEOUT,
              'RevenueCat logOut timed out',
            );
          });
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          retryCondition: isRetryableRevenueCatError,
        },
      );

      if (!retryResult.success) {
        console.error('Error logging out RevenueCat user:', retryResult.error);
        throw retryResult.error;
      }

      console.log('RevenueCat user logged out');
      return retryResult.result;
    } catch (error) {
      console.error('Error logging out RevenueCat user:', error);
      throw error;
    }
  },

  /**
   * Check if user is in grace period (payment failed but still has access)
   */
  isInGracePeriod: (customerInfo: CustomerInfo): boolean => {
    const oddityEntitlement = customerInfo.entitlements.active['oddity'];
    if (!oddityEntitlement) return false;
    // RevenueCat EntitlementInfo may have isInGracePeriod property
    if ('isInGracePeriod' in oddityEntitlement) {
      return Boolean(
        (oddityEntitlement as { isInGracePeriod?: boolean }).isInGracePeriod,
      );
    }
    return false;
  },

  /**
   * Check if subscription will renew
   */
  willRenew: (customerInfo: CustomerInfo): boolean => {
    const oddityEntitlement = customerInfo.entitlements.active['oddity'];
    return oddityEntitlement?.willRenew ?? true;
  },

  /**
   * Get grace period expiration date
   */
  getGracePeriodExpiration: (customerInfo: CustomerInfo): string | null => {
    const oddityEntitlement = customerInfo.entitlements.active['oddity'];
    if (!oddityEntitlement) return null;
    return oddityEntitlement.expirationDate;
  },
};

export const SUBSCRIPTION_PLANS = {
  ODDITY: 'oddity',
};

export const SUBSCRIPTION_PRODUCTS = {
  ODDITY_MONTHLY: 'oddity_monthly',
};
