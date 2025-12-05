import { RevenueCat } from '@/services/revenueCatWrapper';

/**
 * Verifies that RevenueCat SDK is properly initialized and responding
 * @returns {Promise<boolean>} True if verification succeeds, false otherwise
 */
export const verifyRevenueCatSetup = async (): Promise<boolean> => {
  if (!RevenueCat.isAvailable || !RevenueCat.Purchases) {
    if (!__DEV__) {
      console.warn('⚠️ RevenueCat not available - skipping verification');
    }
    return false;
  }

  try {
    // Add timeout to prevent hanging
    const timeout = __DEV__ ? 2000 : 5000;
    const customerInfoPromise = RevenueCat.Purchases.getCustomerInfo();
    const timeoutPromise = new Promise<any>((_, reject) => {
      setTimeout(() => reject(new Error('Verification timeout')), timeout);
    });

    const customerInfo = await Promise.race([
      customerInfoPromise,
      timeoutPromise,
    ]);

    if (customerInfo) {
      if (__DEV__) {
        console.log(
          '✅ RevenueCat setup verified: SDK initialized and responding.',
        );
        console.log('📊 Customer ID:', customerInfo.originalAppUserId);
        console.log(
          '🎫 Active Entitlements:',
          Object.keys(customerInfo.entitlements.active).length,
        );
      }
      return true;
    } else {
      if (!__DEV__) {
        console.warn(
          '⚠️ RevenueCat initialized but no customer info returned yet.',
        );
      }
      return false;
    }
  } catch (error) {
    // Only log errors in production
    if (!__DEV__) {
      console.error('❌ RevenueCat verification failed:', error);
    }
    return false;
  }
};
