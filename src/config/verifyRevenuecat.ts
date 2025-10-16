import Purchases from 'react-native-purchases';

/**
 * Verifies that RevenueCat SDK is properly initialized and responding
 * @returns {Promise<boolean>} True if verification succeeds, false otherwise
 */
export const verifyRevenueCatSetup = async (): Promise<boolean> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    if (customerInfo) {
      console.log('✅ RevenueCat setup verified: SDK initialized and responding.');
      console.log('📊 Customer ID:', customerInfo.originalAppUserId);
      console.log('🎫 Active Entitlements:', Object.keys(customerInfo.entitlements.active).length);
      return true;
    } else {
      console.warn('⚠️ RevenueCat initialized but no customer info returned yet.');
      return false;
    }
  } catch (error) {
    console.error('❌ RevenueCat verification failed:', error);
    return false;
  }
};

