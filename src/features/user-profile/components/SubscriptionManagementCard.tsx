import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Linking, Alert } from 'react-native';
import { Button } from '@/shared/components/Button';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '@/hooks/useTheme';
import { showToast } from '@/utils/showToast';

export function SubscriptionManagementCard() {
  const { theme } = useTheme();
  const {
    customerInfo,
    offerings,
    isLoading,
    error,
    hasActiveSubscription,
    subscriptionTier,
    subscriptionExpiration,
    purchasePackage,
    restorePurchases,
  } = useSubscription();

  const handleManageSubscription = useCallback(async () => {
    const url = Platform.select({
      ios: 'https://apps.apple.com/account/subscriptions',
      android: 'https://play.google.com/store/account/subscriptions',
    });

    if (!url) {
      showToast({ type: 'error', message: 'Unable to open subscription management on this platform.' });
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        showToast({ type: 'error', message: 'Unable to open subscription management.' });
      }
    } catch (error) {
      console.error('Error opening subscription management:', error);
      showToast({ type: 'error', message: 'Failed to open subscription management.' });
    }
  }, []);

  const handleUpgrade = useCallback(async () => {
    if (!offerings?.current?.availablePackages || offerings.current.availablePackages.length === 0) {
      showToast({ type: 'error', message: 'No subscription packages available.' });
      return;
    }

    try {
      // Get the first available package (or you could implement logic to choose a specific package)
      const packageToPurchase = offerings.current.availablePackages[0];
      await purchasePackage(packageToPurchase);
      showToast({ type: 'success', message: 'Subscription activated successfully!' });
    } catch (error) {
      // Error is already handled by the hook
      console.error('Purchase error:', error);
    }
  }, [offerings, purchasePackage]);

  const handleRestore = useCallback(async () => {
    try {
      await restorePurchases();
      showToast({ type: 'success', message: 'Purchases restored successfully!' });
    } catch (error) {
      // Error is already handled by the hook
      console.error('Restore error:', error);
    }
  }, [restorePurchases]);

  const formatExpirationDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const getPlanDisplayName = () => {
    if (hasActiveSubscription) {
      return subscriptionTier === 'oddity' ? 'Oddity Plan' : 'Premium Plan';
    }
    return 'Free Plan';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>
          Loading subscription info...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.planInfo}>
        <Text style={[styles.planName, { color: theme.text }]}>
          {getPlanDisplayName()}
        </Text>
        {subscriptionExpiration && (
          <Text style={[styles.expirationText, { color: theme.textMuted }]}>
            Expires: {formatExpirationDate(subscriptionExpiration)}
          </Text>
        )}
      </View>

      {error && (
        <Text style={[styles.errorText, { color: theme.error }]}>
          {error}
        </Text>
      )}

      <View style={styles.buttonContainer}>
        {hasActiveSubscription ? (
          <Button
            title="Manage Subscription"
            onPress={handleManageSubscription}
            variant="secondary"
          />
        ) : (
          <Button
            title="Upgrade to Oddity"
            onPress={handleUpgrade}
            variant="primary"
          />
        )}
        
        <Button
          title="Restore Purchases"
          onPress={handleRestore}
          variant="outline"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  planInfo: {
    marginBottom: 16,
    alignItems: 'center',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  expirationText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  buttonContainer: {
    gap: 12,
  },
});

