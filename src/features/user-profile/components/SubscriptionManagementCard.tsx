import React, { useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Button } from '@/shared/components/Button';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/utils/showToast';
import { formatDate } from '@/i18n';
import { RootStackParamList } from '@/types/navigation';

export function SubscriptionManagementCard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const {
    customerInfo,
    // offerings,
    isLoading,
    error,
    hasActiveSubscription,
    subscriptionTier,
    subscriptionExpiration,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,
  } = useSubscription();

  // Load customer info when component mounts (lazy loading)
  useEffect(() => {
    if (user && !customerInfo && !isLoading) {
      // Load customer info in background - don't block rendering
      refreshCustomerInfo().catch(() => {
        // Silently fail - component will show default state
      });
    }
  }, [user, customerInfo, isLoading, refreshCustomerInfo]);

  // Mock offerings for now
  const offerings = { current: null as any };

  // Benefits data
  const freeBenefits = [
    'Up to 15 tasks/month',
    '2 courses',
    '5 Spaced Repetition Reminders',
  ];

  const oddityBenefits = [
    'Up to 70 tasks/month',
    '10 courses',
    '50 Spaced Repetition Reminders',
    'Weekly Analytics',
  ];

  const handleManageSubscription = useCallback(async () => {
    const url = Platform.select({
      ios: 'https://apps.apple.com/account/subscriptions',
      android: 'https://play.google.com/store/account/subscriptions',
    });

    if (!url) {
      showToast({
        type: 'error',
        message: 'Unable to open subscription management on this platform.',
      });
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        showToast({
          type: 'error',
          message: 'Unable to open subscription management.',
        });
      }
    } catch (error) {
      console.error('Error opening subscription management:', error);
      showToast({
        type: 'error',
        message: 'Failed to open subscription management.',
      });
    }
  }, []);

  const handleUpgrade = useCallback(async () => {
    // If offerings aren't available, navigate to PaywallScreen
    if (
      !offerings?.current?.availablePackages ||
      offerings.current.availablePackages.length === 0
    ) {
      // Navigate to PaywallScreen when offerings aren't available
      navigation.navigate('PaywallScreen', { variant: 'general' });
      return;
    }

    try {
      // Try to find the oddity_monthly package first
      const oddityPackage = offerings.current.availablePackages.find(
        (pkg: any) => pkg.identifier === 'oddity_monthly',
      );

      // Fallback to first available package if oddity_monthly not found
      const packageToPurchase =
        oddityPackage || offerings.current.availablePackages[0];

      await purchasePackage(packageToPurchase);
      showToast({
        type: 'success',
        message: 'You have successfully become an Oddity!',
      });
    } catch (error: any) {
      // Don't show error if user cancelled
      if (error?.userCancelled) {
        return;
      }
      // Error is already handled by the hook
      console.error('Purchase error:', error);
    }
  }, [offerings, purchasePackage, navigation]);

  const handleRestore = useCallback(async () => {
    try {
      await restorePurchases();
      showToast({
        type: 'success',
        message: 'Purchases restored successfully!',
      });
    } catch (error) {
      // Error is already handled by the hook
      console.error('Restore error:', error);
    }
  }, [restorePurchases]);

  const formatExpirationDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return formatDate(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  };

  // Detect mismatch between database and RevenueCat
  const hasMismatch = useMemo(() => {
    if (isLoading || !user) return false;

    const dbTier = user.subscription_tier || 'free';
    const rcTier = subscriptionTier || 'free';

    return (
      (dbTier === 'oddity' && rcTier === 'free') ||
      (dbTier === 'free' && rcTier === 'oddity') ||
      (dbTier === 'oddity' && customerInfo === null)
    );
  }, [isLoading, user, subscriptionTier, customerInfo]);

  // Log mismatch for monitoring
  useEffect(() => {
    if (hasMismatch && user) {
      console.error('⚠️ Subscription mismatch detected:', {
        userId: user.id,
        dbTier: user.subscription_tier,
        rcTier: subscriptionTier,
        hasCustomerInfo: !!customerInfo,
      });
    }
  }, [hasMismatch, user, subscriptionTier, customerInfo]);

  // Determine current plan display (default to free on error)
  const currentPlanTier = useMemo(() => {
    // If error loading, default to free
    if (error) {
      return 'free';
    }

    // If mismatch, use database tier as source of truth
    if (hasMismatch && user) {
      return user.subscription_tier || 'free';
    }

    // Normal case: use RevenueCat tier
    return subscriptionTier || 'free';
  }, [error, hasMismatch, user, subscriptionTier]);

  const getPlanDisplayName = () => {
    return currentPlanTier === 'oddity' ? 'ODDITY' : 'FREE';
  };

  const getBenefitsHeading = () => {
    return currentPlanTier === 'oddity'
      ? 'You get the full experience'
      : "You're getting started with the basics";
  };

  const getBenefits = () => {
    return currentPlanTier === 'oddity' ? oddityBenefits : freeBenefits;
  };

  // Show default state immediately (no loading spinner)
  // Default to free tier if still loading
  const displayTier = isLoading ? 'free' : currentPlanTier;

  return (
    <View style={styles.container}>
      <View style={styles.planInfo}>
        <Text style={[styles.planName, { color: theme.text }]}>
          {getPlanDisplayName()}
        </Text>
        {/* Show expiration only for Oddity users in normal state */}
        {displayTier === 'oddity' && !hasMismatch && subscriptionExpiration && (
          <Text style={[styles.expirationText, { color: theme.textMuted }]}>
            Renews: {formatExpirationDate(subscriptionExpiration)}
          </Text>
        )}
      </View>

      {/* Benefits Section */}
      <View style={styles.benefitsSection}>
        <Text style={[styles.benefitsHeading, { color: theme.text }]}>
          {getBenefitsHeading()}
        </Text>
        <View style={styles.benefitsList}>
          {getBenefits().map((benefit, index) => (
            <Text
              key={index}
              style={[styles.benefitItem, { color: theme.textSecondary }]}>
              • {benefit}
            </Text>
          ))}
        </View>
      </View>

      {/* Button Section */}
      <View style={styles.buttonContainer}>
        {hasMismatch ? (
          // Mismatch detected: show only Restore Purchases button
          <Button
            title="Restore Purchases"
            onPress={handleRestore}
            variant="primary"
          />
        ) : displayTier === 'oddity' ? (
          // Oddity user: show Manage Membership button
          <Button
            title="Manage Membership"
            onPress={handleManageSubscription}
            variant="primary"
          />
        ) : (
          // Free user: show Become an Oddity button
          <Button
            title="Become an Oddity"
            onPress={handleUpgrade}
            variant="primary"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  planInfo: {
    marginBottom: 16,
    alignItems: 'center',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  expirationText: {
    fontSize: 14,
  },
  benefitsSection: {
    marginBottom: 20,
  },
  benefitsHeading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 8,
  },
});
