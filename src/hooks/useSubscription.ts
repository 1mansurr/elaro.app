import { useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSoftLaunch } from '../contexts/SoftLaunchContext';
import { paystackService, SUBSCRIPTION_PLANS } from '../services/paystack';
import { subscriptionService } from '../services/supabase';

export const useSubscription = () => {
  const { user, refreshUser } = useAuth();
  const { showComingSoonModal } = useSoftLaunch();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const isSubscribed = user?.is_subscribed_to_oddity || false;

  // ────────────────────────────────────────────────
  // 🔁 Listen for Paystack deep link returns
  // ────────────────────────────────────────────────
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        if (!url.includes('subscription-success')) return;

        const urlParams = new URLSearchParams(url.split('?')[1]);
        const reference = urlParams.get('reference');

        if (reference && user) {
          await verifyAndCompleteSubscription(reference);
        } else {
          await assumeSubscriptionSuccess();
        }
      } catch (err) {
        console.error('[Deep Link Error]', err);
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

    // Check if the app opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  // ────────────────────────────────────────────────
  // 💳 Initiate Subscription Flow (Now enabled)
  // ────────────────────────────────────────────────
  const initiateOdditySubscription = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      // Open Paystack payment page
      const paymentUrl = paystackService.openOddityPayment(user.email);
      // Open in-app browser or external browser
      await Linking.openURL(paymentUrl);
      // Payment success is handled via deep link (see useEffect above)
    } catch (error) {
      setIsProcessing(false);
      // Log failure event
      // Optionally: analyticsService.logEvent('upgrade_failed', { userId: user.id, error: error?.message });
      Alert.alert(
        'Payment not completed',
        'It looks like your payment didn’t go through. You can try again anytime by tapping “Become an Oddity.”'
      );
    }
  };

  // ────────────────────────────────────────────────
  // ✅ Handle verified subscription with reference
  // ────────────────────────────────────────────────
  const verifyAndCompleteSubscription = async (reference: string) => {
    if (!user) return;

    try {
      setIsProcessing(true);

      const result = await paystackService.handleSubscriptionSuccess(reference, user.id);

      if (result.success) {
        await refreshUser();
        setShowSuccessModal(true);
      } else {
        Alert.alert(
          'Subscription Error',
          result.message || 'Subscription failed. Please contact support.',
        );
      }
    } catch (error) {
      console.error('[Verify Subscription Error]', error);
      Alert.alert(
        'Subscription Error',
        'Could not verify your payment. Contact support if you were charged.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // ────────────────────────────────────────────────
  // 🎉 Assume success if user returns with no ref
  // ────────────────────────────────────────────────
  const assumeSubscriptionSuccess = async () => {
    try {
      await refreshUser();
      if (user?.is_subscribed_to_oddity) {
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('[Assume Subscription Success Error]', error);
    }
  };

  // ────────────────────────────────────────────────
  // ❌ Cancel Oddity Subscription
  // ────────────────────────────────────────────────
  const cancelOdditySubscription = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await subscriptionService.deactivateSubscription(user.id);
      await refreshUser();
      Alert.alert('Subscription Cancelled', 'Your Oddity subscription has been cancelled. You will retain access until the end of your billing period.');
    } catch (error) {
      console.error('[Cancel Subscription Error]', error);
      Alert.alert('Cancellation Error', 'Could not cancel your subscription. Please try again or contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  const closeSuccessModal = () => setShowSuccessModal(false);

  return {
    isSubscribed,
    isProcessing,
    showSuccessModal,
    initiateOdditySubscription,
    closeSuccessModal,
    subscriptionPlan: SUBSCRIPTION_PLANS.ODDITY,
    cancelOdditySubscription, // <-- Expose cancel function
  };
};

