/**
 * RevenueCat Wrapper - Safe Import Layer
 *
 * Provides a safe wrapper around react-native-purchases that gracefully
 * handles cases where the package is not available or not properly linked.
 * This prevents build failures when the native module is unavailable.
 */

let Purchases: any = null;
let PurchasesOffering: any = null;
let PurchasesPackage: any = null;
let CustomerInfo: any = null;

let isAvailable = false;

try {
  const PurchasesModule = require('react-native-purchases');
  Purchases = PurchasesModule.default || PurchasesModule;
  PurchasesOffering = PurchasesModule.PurchasesOffering;
  PurchasesPackage = PurchasesModule.PurchasesPackage;
  CustomerInfo = PurchasesModule.CustomerInfo;
  isAvailable = true;
  console.log('✅ RevenueCat module loaded successfully');
} catch (e) {
  console.warn(
    '⚠️ RevenueCat not available - subscription features disabled',
  );
  isAvailable = false;
}

export const RevenueCat = {
  Purchases,
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  isAvailable,
};

// Type-safe exports - these will be the actual types when RevenueCat is available
export type PurchasesOfferingType = typeof PurchasesOffering;
export type PurchasesPackageType = typeof PurchasesPackage;
export type CustomerInfoType = typeof CustomerInfo;

