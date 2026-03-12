import { useCallback } from 'react';
import {
  RevenueCat,
  CustomerInfoType as CustomerInfo,
  PurchasesPackageType as PurchasesPackage,
} from '@/services/revenueCatWrapper';

interface UseSubscriptionReturn {
  // Status
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  error: string | null;

  // Subscription state
  hasActiveSubscription: boolean;
  subscriptionTier: string;
  subscriptionExpiration: string | null;
  isInGracePeriod: boolean;
  gracePeriodExpiration: string | null;

  // Actions
  purchasePackage: (
    packageToPurchase: PurchasesPackage,
  ) => Promise<CustomerInfo>;
  restorePurchases: () => Promise<CustomerInfo>;
  refreshCustomerInfo: () => Promise<void>;
  clearError: () => void;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const purchasePackage = useCallback(
    async (_packageToPurchase: PurchasesPackage): Promise<CustomerInfo> => {
      throw new Error('RevenueCat not available');
    },
    [],
  );

  const restorePurchases = useCallback(async (): Promise<CustomerInfo> => {
    throw new Error('RevenueCat not available');
  }, []);

  const refreshCustomerInfo = useCallback(async () => {}, []);

  const clearError = useCallback(() => {}, []);

  return {
    customerInfo: null,
    isLoading: false,
    error: null,
    hasActiveSubscription: false,
    subscriptionTier: 'free',
    subscriptionExpiration: null,
    isInGracePeriod: false,
    gracePeriodExpiration: null,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,
    clearError,
  };
};
