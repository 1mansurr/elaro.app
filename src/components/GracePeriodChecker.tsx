import { useEffect, useState } from 'react';
import { Alert, Platform, Linking } from 'react-native';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { revenueCatService } from '@/services/revenueCat';

/**
 * GracePeriodChecker component
 * 
 * Checks if the user is in a grace period (payment issue) and shows an alert.
 * This component must be placed inside the AuthProvider to access the user context.
 * 
 * This component doesn't render anything - it only handles side effects.
 */
export const GracePeriodChecker = () => {
  const { user } = useAuth();
  const [hasShownAlert, setHasShownAlert] = useState(false);

  useEffect(() => {
    const checkGracePeriod = async () => {
      if (!user || hasShownAlert) return;

      try {
        const customerInfo = await revenueCatService.getCustomerInfo();
        const isInGrace = revenueCatService.isInGracePeriod(customerInfo);

        if (isInGrace) {
          const graceExpiration = revenueCatService.getGracePeriodExpiration(customerInfo);
          const expirationDate = graceExpiration ? new Date(graceExpiration).toLocaleDateString() : 'soon';
          
          Alert.alert(
            '⚠️ Payment Issue',
            `Your subscription payment failed. Please update your payment method by ${expirationDate} to keep your Oddity access.`,
            [
              { text: 'Update Payment', onPress: handleUpdatePayment },
              { text: 'Later', style: 'cancel' },
            ]
          );
          
          setHasShownAlert(true);
        }
      } catch (error) {
        console.error('Error checking grace period:', error);
      }
    };

    checkGracePeriod();
  }, [user, hasShownAlert]);

  const handleUpdatePayment = () => {
    const url = Platform.select({
      ios: 'https://apps.apple.com/account/subscriptions',
      android: 'https://play.google.com/store/account/subscriptions',
    });
    
    if (url) {
      Linking.openURL(url).catch(err => console.error('Failed to open payment settings:', err));
    }
  };

  return null; // This component doesn't render anything
};

