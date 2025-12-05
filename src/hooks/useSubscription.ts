import { useState, useEffect, useCallback } from 'react';
import {
  RevenueCat,
  CustomerInfoType as CustomerInfo,
  PurchasesPackageType as PurchasesPackage,
} from '@/services/revenueCatWrapper';
import { revenueCatService } from '@/services/revenueCat';
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
  isInTrial: boolean;
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

  // Early return if RevenueCat not available
  if (!RevenueCat.isAvailable) {
    return {
      customerInfo: null,
      isLoading: false,
      error: 'RevenueCat not available',
      hasActiveSubscription: false,
      subscriptionTier: 'free',
      subscriptionExpiration: null,
      isInTrial: false,
      isInGracePeriod: false,
      gracePeriodExpiration: null,
      purchasePackage: async () => {
        throw new Error('RevenueCat not available');
      },
      restorePurchases: async () => {
        throw new Error('RevenueCat not available');
      },
      refreshCustomerInfo: async () => {},
      clearError: () => {},
    };
  }

  // Load customer information (deferred - only when explicitly called)
  const loadCustomerInfo = useCallback(async () => {
    // Add timeout in dev mode to prevent hanging
    const timeout = __DEV__ ? 2000 : 5000;
    try {
      const timeoutPromise = new Promise<CustomerInfo>((_, reject) => {
        setTimeout(
          () => reject(new Error('Customer info fetch timeout')),
          timeout,
        );
      });

      const infoPromise = revenueCatService.getCustomerInfo();
      const info = await Promise.race([infoPromise, timeoutPromise]);

      setCustomerInfo(info);
      setError(null);
    } catch (err) {
      // Only log errors in dev mode to reduce noise
      if (__DEV__) {
        console.error('Error loading customer info:', err);
      }
      // Don't set error state - allow app to continue without subscription info
      // Error will be shown only when user tries to use subscription features
      setError(null);
    }
  }, []);

  // Purchase a subscription
  const purchasePackage = useCallback(
    async (packageToPurchase: PurchasesPackage): Promise<CustomerInfo> => {
      setIsLoading(true);
      setError(null);

      try {
        const info = await revenueCatService.purchasePackage(packageToPurchase);
        setCustomerInfo(info);

        // Update user subscription in backend
        await updateUserSubscription(info);

        return info;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Purchase failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<CustomerInfo> => {
    setIsLoading(true);
    setError(null);

    try {
      const info = await revenueCatService.restorePurchases();
      setCustomerInfo(info);

      // Update user subscription in backend
      await updateUserSubscription(info);

      return info;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Restore failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update user subscription in backend
  const updateUserSubscription = async (customerInfo: CustomerInfo) => {
    if (!user) return;

    try {
      // Get fresh access token to ensure it's valid
      const { getFreshAccessToken } = await import(
        '@/utils/getFreshAccessToken'
      );
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
  };

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values
  const hasActiveSubscription = customerInfo
    ? revenueCatService.hasActiveSubscription(customerInfo)
    : false;
  const subscriptionTier = customerInfo
    ? revenueCatService.getSubscriptionTier(customerInfo)
    : 'free';
  const subscriptionExpiration = customerInfo
    ? revenueCatService.getSubscriptionExpiration(customerInfo)
    : null;
  const isInTrial = customerInfo
    ? revenueCatService.isInTrial(customerInfo)
    : false;
  const isInGracePeriod = customerInfo
    ? revenueCatService.isInGracePeriod(customerInfo)
    : false;
  const gracePeriodExpiration = customerInfo
    ? revenueCatService.getGracePeriodExpiration(customerInfo)
    : null;

  // Set RevenueCat user ID when user changes
  useEffect(() => {
    if (user?.id) {
      revenueCatService.setUserId(user.id).catch(err => {
        console.error('Failed to set RevenueCat user ID:', err);
      });
    }
  }, [user?.id]);

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

  return {
    customerInfo,
    isLoading,
    error,
    hasActiveSubscription,
    subscriptionTier,
    subscriptionExpiration,
    isInTrial,
    isInGracePeriod,
    gracePeriodExpiration,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo: loadCustomerInfo,
    clearError,
  };
};
