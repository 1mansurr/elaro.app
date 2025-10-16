import Purchases, { 
  PurchasesOffering, 
  PurchasesPackage, 
  CustomerInfo,
  PurchasesError 
} from 'react-native-purchases';

export const revenueCatService = {
  /**
   * Initialize RevenueCat with API key
   * @returns {Promise<boolean>} True if initialization succeeded, false otherwise
   */
  initialize: async (apiKey: string): Promise<boolean> => {
    try {
      // Validate API key format
      if (!apiKey || apiKey.length < 10) {
        console.warn('⚠️ RevenueCat API key is missing or invalid. Skipping initialization.');
        return false;
      }

      await Purchases.configure({ apiKey });
      console.log('✅ RevenueCat initialized successfully');
      return true;
    } catch (error: any) {
      // Handle specific RevenueCat errors gracefully
      if (error?.message?.includes('Invalid API key')) {
        console.error('❌ RevenueCat API key is invalid:', error.message);
      } else {
        console.error('❌ RevenueCat initialization failed:', error?.message || error);
      }
      // Don't throw - allow app to continue without RevenueCat
      return false;
    }
  },

  /**
   * Get current offerings from RevenueCat
   */
  getOfferings: async (): Promise<PurchasesOffering | null> => {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('Error fetching offerings:', error);
      return null;
    }
  },

  /**
   * Purchase a specific package
   */
  purchasePackage: async (packageToPurchase: PurchasesPackage): Promise<CustomerInfo> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      console.log('Purchase successful:', customerInfo);
      return customerInfo;
    } catch (error) {
      if (error instanceof PurchasesError) {
        if (error.code === 'PURCHASES_ERROR_PURCHASE_CANCELLED') {
          throw new Error('Purchase was cancelled by user');
        }
        throw new Error(`Purchase failed: ${error.message}`);
      }
      throw error;
    }
  },

  /**
   * Restore previous purchases
   */
  restorePurchases: async (): Promise<CustomerInfo> => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      console.log('Purchases restored successfully');
      return customerInfo;
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
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
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
    return oddityEntitlement?.isInIntroOfferPeriod || false;
  },

  /**
   * Set user ID for RevenueCat (should match your backend user ID)
   */
  setUserId: async (userId: string): Promise<void> => {
    try {
      await Purchases.logIn(userId);
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
      const customerInfo = await Purchases.logOut();
      console.log('RevenueCat user logged out');
      return customerInfo;
    } catch (error) {
      console.error('Error logging out RevenueCat user:', error);
      throw error;
    }
  }
};

export const SUBSCRIPTION_PLANS = {
  ODDITY: 'oddity',
};

export const SUBSCRIPTION_PRODUCTS = {
  ODDITY_MONTHLY: 'oddity_monthly',
};
