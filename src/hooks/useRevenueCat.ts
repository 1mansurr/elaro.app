import { useState, useEffect, useCallback } from 'react';
import { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { revenueCatService } from '@/services/revenueCat';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { supabase } from '@/services/supabase';

interface UseRevenueCatReturn {
  customerInfo: CustomerInfo | null;
  offerings: any;
  isLoading: boolean;
  error: string | null;
  hasActiveSubscription: boolean;
  subscriptionTier: string;
  subscriptionExpiration: string | null;
  isInTrial: boolean;
  purchasePackage: (packageToPurchase: PurchasesPackage) => Promise<CustomerInfo>;
  restorePurchases: () => Promise<CustomerInfo>;
  refreshCustomerInfo: () => Promise<void>;
  clearError: () => void;
}

/**
 * React hook for managing RevenueCat subscriptions
 * Provides a clean interface for components to interact with the subscription system
 */
export const useRevenueCat = (): UseRevenueCatReturn => {
  const { user } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load current customer information from RevenueCat
   */
  const loadCustomerInfo = useCallback(async () => {
    try {
      const info = await revenueCatService.getCustomerInfo();
      setCustomerInfo(info);
      setError(null);
    } catch (err) {
      console.error('Error loading customer info:', err);
      setError('Failed to load subscription info');
    }
  }, []);

  /**
   * Load available offerings from RevenueCat
   */
  const loadOfferings = useCallback(async () => {
    try {
      const currentOfferings = await revenueCatService.getOfferings();
      setOfferings(currentOfferings);
      setError(null);
    } catch (err) {
      console.error('Error loading offerings:', err);
      setError('Failed to load subscription options');
    }
  }, []);

  /**
   * Purchase a subscription package
   */
  const purchasePackage = useCallback(async (packageToPurchase: PurchasesPackage): Promise<CustomerInfo> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const info = await revenueCatService.purchasePackage(packageToPurchase);
      setCustomerInfo(info);
      
      // Update user subscription in your backend
      await updateUserSubscription(info);
      
      return info;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Restore previous purchases
   */
  const restorePurchases = useCallback(async (): Promise<CustomerInfo> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const info = await revenueCatService.restorePurchases();
      setCustomerInfo(info);
      
      // Update user subscription in your backend
      await updateUserSubscription(info);
      
      return info;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Restore failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update user subscription in backend database
   */
  const updateUserSubscription = async (customerInfo: CustomerInfo) => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('update-revenuecat-subscription', {
        body: { 
          customerInfo,
          userId: user.id 
        }
      });
      
      if (error) {
        console.error('Failed to update user subscription:', error);
        throw new Error('Failed to sync subscription with server');
      }
    } catch (err) {
      console.error('Error updating user subscription:', err);
      throw err;
    }
  };

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values
  const hasActiveSubscription = customerInfo ? revenueCatService.hasActiveSubscription(customerInfo) : false;
  const subscriptionTier = customerInfo ? revenueCatService.getSubscriptionTier(customerInfo) : 'free';
  const subscriptionExpiration = customerInfo ? revenueCatService.getSubscriptionExpiration(customerInfo) : null;
  const isInTrial = customerInfo ? revenueCatService.isInTrial(customerInfo) : false;

  // Set RevenueCat user ID when user changes
  useEffect(() => {
    if (user?.id) {
      revenueCatService.setUserId(user.id).catch((err) => {
        console.error('Failed to set RevenueCat user ID:', err);
      });
    }
  }, [user?.id]);

  // Load customer info and offerings when user changes
  useEffect(() => {
    if (user) {
      loadCustomerInfo();
      loadOfferings();
    } else {
      setCustomerInfo(null);
      setOfferings(null);
    }
  }, [user, loadCustomerInfo, loadOfferings]);

  return {
    customerInfo,
    offerings,
    isLoading,
    error,
    hasActiveSubscription,
    subscriptionTier,
    subscriptionExpiration,
    isInTrial,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo: loadCustomerInfo,
    clearError,
  };
};

/**
 * Simplified hook that only provides subscription status
 * Use this when you just need to check subscription status without managing purchases
 */
export const useSubscriptionStatus = () => {
  const { user } = useAuth();
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!user) {
        setSubscriptionTier('free');
        setHasActiveSubscription(false);
        setIsLoading(false);
        return;
      }

      try {
        const customerInfo = await revenueCatService.getCustomerInfo();
        const tier = revenueCatService.getSubscriptionTier(customerInfo);
        const hasActive = revenueCatService.hasActiveSubscription(customerInfo);
        
        setSubscriptionTier(tier);
        setHasActiveSubscription(hasActive);
      } catch (error) {
        console.error('Error checking subscription status:', error);
        setSubscriptionTier('free');
        setHasActiveSubscription(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscriptionStatus();
  }, [user]);

  return {
    subscriptionTier,
    hasActiveSubscription,
    isLoading,
    isPremium: hasActiveSubscription,
  };
};
