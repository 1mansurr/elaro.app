/**
 * RevenueCat Recovery Strategies
 *
 * Provides recovery strategies for RevenueCat operations with fallback options.
 */

import {
  RevenueCat,
  PurchasesOfferingType as PurchasesOffering,
} from '@/services/revenueCatWrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHED_OFFERINGS_KEY = '@elaro_cached_offerings';
const CACHED_CUSTOMER_INFO_KEY = '@elaro_cached_customer_info';

/**
 * Get cached offerings from AsyncStorage
 */
async function getCachedOfferings(): Promise<PurchasesOffering | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHED_OFFERINGS_KEY);
    if (
      cached &&
      cached.trim() &&
      cached !== 'undefined' &&
      cached !== 'null'
    ) {
      let parsed: any;
      try {
        parsed = JSON.parse(cached);
      } catch {
        return null;
      }
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
 * Get offerings with recovery strategy
 * Returns cached offerings or null when RevenueCat is unavailable.
 */
export async function getOfferingsWithRecovery(): Promise<PurchasesOffering | null> {
  if (!RevenueCat.isAvailable) {
    console.warn(
      '⚠️ RevenueCat not available - using cached/default offerings',
    );
    const cached = await getCachedOfferings();
    return cached || null;
  }

  return null;
}

/**
 * Get customer info with recovery strategy
 * Returns null when RevenueCat is unavailable.
 */
export async function getCustomerInfoWithRecovery(): Promise<null> {
  if (!RevenueCat.isAvailable) {
    console.warn('⚠️ RevenueCat not available - using cached customer info');
    try {
      const cached = await AsyncStorage.getItem(CACHED_CUSTOMER_INFO_KEY);
      if (
        cached &&
        cached.trim() &&
        cached !== 'undefined' &&
        cached !== 'null'
      ) {
        let parsed: any;
        try {
          parsed = JSON.parse(cached);
          return parsed.data;
        } catch {
          return null;
        }
      }
    } catch {
      // Ignore cache errors
    }
    throw new Error('RevenueCat not available and no cached customer info');
  }

  throw new Error('RevenueCat service removed');
}
