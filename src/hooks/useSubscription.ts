import { useState, useEffect, useCallback } from 'react';
import { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { revenueCatService } from '@/services/revenueCat';
import { useAuth } from '@/features/auth/contexts/AuthContext';
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
  purchasePackage: (packageToPurchase: PurchasesPackage) => Promise<CustomerInfo>;
  restorePurchases: () => Promise<CustomerInfo>;
  refreshCustomerInfo: () => Promise<void>;
  clearError: () => void;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const { user } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load customer information
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

  // Purchase a subscription
  const purchasePackage = useCallback(async (packageToPurchase: PurchasesPackage): Promise<CustomerInfo> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const info = await revenueCatService.purchasePackage(packageToPurchase);
      setCustomerInfo(info);
      
      // Update user subscription in backend
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
      const errorMessage = err instanceof Error ? err.message : 'Restore failed';
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

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values
  const hasActiveSubscription = customerInfo ? revenueCatService.hasActiveSubscription(customerInfo) : false;
  const subscriptionTier = customerInfo ? revenueCatService.getSubscriptionTier(customerInfo) : 'free';
  const subscriptionExpiration = customerInfo ? revenueCatService.getSubscriptionExpiration(customerInfo) : null;
  const isInTrial = customerInfo ? revenueCatService.isInTrial(customerInfo) : false;
  const isInGracePeriod = customerInfo ? revenueCatService.isInGracePeriod(customerInfo) : false;
  const gracePeriodExpiration = customerInfo ? revenueCatService.getGracePeriodExpiration(customerInfo) : null;

  // Set RevenueCat user ID when user changes
  useEffect(() => {
    if (user?.id) {
      revenueCatService.setUserId(user.id).catch((err) => {
        console.error('Failed to set RevenueCat user ID:', err);
      });
    }
  }, [user?.id]);

  // Load customer info when user changes
  useEffect(() => {
    if (user) {
      loadCustomerInfo();
    } else {
      setCustomerInfo(null);
    }
  }, [user, loadCustomerInfo]);

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
