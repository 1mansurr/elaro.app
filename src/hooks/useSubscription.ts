import { useState, useEffect, useCallback } from 'react';
import {
  RevenueCat,
  CustomerInfoType as CustomerInfo,
  PurchasesPackageType as PurchasesPackage,
} from '@/services/revenueCatWrapper';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';

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
  const { user } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update user subscription in backend
  const updateUserSubscription = useCallback(
    async (customerInfo: CustomerInfo) => {
      if (!user) return;

      try {
        // Get fresh access token to ensure it's valid
        const { getFreshAccessToken } =
          await import('@/utils/getFreshAccessToken');
        const accessToken = await getFreshAccessToken();

        const { error } = await supabase.functions.invoke(
          'update-revenuecat-subscription',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: {
              customerInfo,
              userId: user.id,
            },
          },
        );

        if (error) {
          console.error('Failed to update user subscription:', error);
          throw new Error('Failed to sync subscription with server');
        }
      } catch (err) {
        console.error('Error updating user subscription:', err);
        throw err;
      }
    },
    [user],
  );

  // Load customer information (deferred - only when explicitly called)
  const loadCustomerInfo = useCallback(async () => {
    if (!RevenueCat.isAvailable) {
      setError('RevenueCat not available');
    }
  }, []);

  // Purchase a subscription
  const purchasePackage = useCallback(
    async (_packageToPurchase: PurchasesPackage): Promise<CustomerInfo> => {
      throw new Error('RevenueCat not available');
    },
    [],
  );

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<CustomerInfo> => {
    throw new Error('RevenueCat not available');
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // RevenueCat user ID setting removed

  // Defer customer info loading - only load when user is available AND component needs it
  // This prevents blocking app startup with RevenueCat API calls
  // Customer info will be loaded lazily when subscription features are accessed
  useEffect(() => {
    if (user) {
      // Don't automatically load - let components trigger it when needed
      // This prevents blocking app startup
      setCustomerInfo(null);
    } else {
      setCustomerInfo(null);
    }
  }, [user]);

  // Computed values
  const hasActiveSubscription = false;
  const subscriptionTier = 'free';
  const subscriptionExpiration = null;
  const isInGracePeriod = false;
  const gracePeriodExpiration = null;

  // Return early values if RevenueCat not available
  if (!RevenueCat.isAvailable) {
    return {
      customerInfo: null,
      isLoading: false,
      error: 'RevenueCat not available',
      hasActiveSubscription: false,
      subscriptionTier: 'free',
      subscriptionExpiration: null,
      isInGracePeriod: false,
      gracePeriodExpiration: null,
      purchasePackage,
      restorePurchases,
      refreshCustomerInfo: loadCustomerInfo,
      clearError,
    };
  }

  return {
    customerInfo,
    isLoading,
    error,
    hasActiveSubscription,
    subscriptionTier,
    subscriptionExpiration,
    isInGracePeriod,
    gracePeriodExpiration,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo: loadCustomerInfo,
    clearError,
  };
};
