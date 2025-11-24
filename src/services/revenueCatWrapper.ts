/**
 * RevenueCat Wrapper - Safe Import Layer
 *
 * Provides a safe wrapper around react-native-purchases that gracefully
 * handles cases where the package is not available or not properly linked.
 * This prevents build failures when the native module is unavailable.
 */

// Type definitions for RevenueCat modules
type PurchasesModule = {
  configure: (apiKey: string) => void;
  setUserId: (userId: string) => Promise<void>;
  getOfferings: () => Promise<unknown>;
  purchasePackage: (pkg: unknown) => Promise<unknown>;
  restorePurchases: () => Promise<unknown>;
  getCustomerInfo: () => Promise<unknown>;
  [key: string]: unknown;
};

type PurchasesOfferingModule = {
  identifier: string;
  serverDescription: string;
  availablePackages: unknown[];
  [key: string]: unknown;
};

type PurchasesPackageModule = {
  identifier: string;
  packageType: string;
  product: unknown;
  offeringIdentifier: string;
  [key: string]: unknown;
};

type CustomerInfoModule = {
  entitlements: Record<string, unknown>;
  activeSubscriptions: string[];
  allPurchasedProductIdentifiers: string[];
  [key: string]: unknown;
};

let Purchases: PurchasesModule | null = null;
let PurchasesOffering: PurchasesOfferingModule | null = null;
let PurchasesPackage: PurchasesPackageModule | null = null;
let CustomerInfo: CustomerInfoModule | null = null;

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
  console.warn('⚠️ RevenueCat not available - subscription features disabled');
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
