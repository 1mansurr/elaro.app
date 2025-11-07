/**
 * RevenueCat Recovery Strategies
 *
 * Provides recovery strategies for RevenueCat operations with fallback options.
 */

import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { executeWithRecovery, RecoveryStrategy } from './errorRecovery';
import { revenueCatService } from '@/services/revenueCat';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHED_OFFERINGS_KEY = '@elaro_cached_offerings';
const CACHED_CUSTOMER_INFO_KEY = '@elaro_cached_customer_info';

/**
 * Get cached offerings from AsyncStorage
 */
async function getCachedOfferings(): Promise<PurchasesOffering | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHED_OFFERINGS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Check if cache is still valid (not older than 1 hour)
      const cacheAge = Date.now() - (parsed.timestamp || 0);
      if (cacheAge < 60 * 60 * 1000) {
        return parsed.data as PurchasesOffering;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Cache offerings to AsyncStorage
 */
async function cacheOfferings(
  offerings: PurchasesOffering | null,
): Promise<void> {
  try {
    if (offerings) {
      await AsyncStorage.setItem(
        CACHED_OFFERINGS_KEY,
        JSON.stringify({
          data: offerings,
          timestamp: Date.now(),
        }),
      );
    }
  } catch (error) {
    console.error('Failed to cache offerings:', error);
  }
}

/**
 * Create default offering structure when RevenueCat is unavailable
 */
function createDefaultOffering(): PurchasesOffering | null {
  // Return null as default - UI should handle gracefully
  return null;
}

/**
 * Get offerings with recovery strategy
 * Primary: RevenueCat API
 * Fallback 1: Cached offerings
 * Fallback 2: Default offering structure
 */
export async function getOfferingsWithRecovery(): Promise<PurchasesOffering | null> {
  const strategy: RecoveryStrategy<PurchasesOffering | null> = {
    primary: async () => {
      const offerings = await revenueCatService.getOfferingsDirect();
      // Cache successful result
      if (offerings) {
        await cacheOfferings(offerings);
      }
      return offerings;
    },
    fallbacks: [
      // Fallback 1: Return cached offerings
      async () => {
        const cached = await getCachedOfferings();
        if (cached) {
          console.log('✅ Using cached offerings');
          return cached;
        }
        throw new Error('No cached offerings available');
      },
      // Fallback 2: Return default offering structure
      async () => {
        console.log('⚠️ Using default offering structure');
        return createDefaultOffering();
      },
    ],
    shouldRetry: error => {
      // Don't retry user cancellations
      const err = error as { code?: string; message?: string };
      return err?.code !== 'PURCHASES_ERROR_PURCHASE_CANCELLED';
    },
    onFailure: (error, attempt) => {
      console.warn(
        `⚠️ RevenueCat offerings attempt ${attempt} failed:`,
        error.message,
      );
    },
  };

  return executeWithRecovery(strategy);
}

/**
 * Get customer info with recovery strategy
 * Primary: RevenueCat API
 * Fallback: Cached customer info
 */
export async function getCustomerInfoWithRecovery(): Promise<
  ReturnType<typeof revenueCatService.getCustomerInfo>
> {
  const strategy: RecoveryStrategy<
    ReturnType<typeof revenueCatService.getCustomerInfo>
  > = {
    primary: async () => {
      return await revenueCatService.getCustomerInfo();
    },
    fallbacks: [
      // Fallback: Return cached customer info
      async () => {
        try {
          const cached = await AsyncStorage.getItem(CACHED_CUSTOMER_INFO_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            const cacheAge = Date.now() - (parsed.timestamp || 0);
            // Cache valid for 24 hours
            if (cacheAge < 24 * 60 * 60 * 1000) {
              console.log('✅ Using cached customer info');
              return parsed.data;
            }
          }
          throw new Error('No cached customer info available');
        } catch {
          throw new Error('Failed to load cached customer info');
        }
      },
    ],
    shouldRetry: () => true,
  };

  return executeWithRecovery(strategy);
}
