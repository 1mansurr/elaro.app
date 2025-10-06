import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PaystackPayment from './PaystackPayment';
import { SuccessModal } from './SubscriptionSuccessModal';
import { useAuth } from '../../contexts/AuthContext';
import { subscriptionService, supabase } from '../../services/supabase';
import { useSubscription } from './useSubscription';
import { ODDITY_AMOUNT, PAYSTACK_PUBLIC_KEY } from './constants';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface AddOddityModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddOddityModal: React.FC<AddOddityModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user, refreshUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const {
    isSubscribed,
    isProcessing: subscriptionProcessing,
    cancelOdditySubscription,
  } = useSubscription();

  const handlePaymentSuccess = async (reference: string) => {
    setIsProcessing(true);
    setShowPayment(false); // Hide the WebView

    try {
      if (!user) throw new Error('User not found');

      // Call our new verify-paystack-transaction Edge Function
      const { data, error } = await supabase.functions.invoke('verify-paystack-transaction', {
        body: { reference },
      });

      if (error) throw error;

      if (data.verified) {
        // Verification successful! Activate subscription and show success.
        await subscriptionService.activateOdditySubscription(user.id);
        await refreshUser();
        setShowSuccess(true);
        onSuccess();
      } else {
        // Verification failed. Show an error message.
        Alert.alert(
          'Payment Verification Failed', 
          data.message || 'We could not confirm your payment. Please contact support.'
        );
      }
    } catch (err) {
      console.error('Verification error:', err);
      Alert.alert(
        'An Error Occurred', 
        'Something went wrong while verifying your payment. Please contact support.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgradePress = () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to upgrade to Oddity.',
        [{ text: 'OK', onPress: onClose }]
      );
      return;
    }
    setIsPaying(true);
    setShowPayment(true);
  };

  const handleClose = () => {
    if (isPaying) {
      setIsPaying(false);
      setShowPayment(false);
    } else {
      onClose();
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    onClose();
  };

  if (isPaying && user) {
    return (
      <PaystackPayment
        email={user.email}
        amount={ODDITY_AMOUNT}
        publicKey={PAYSTACK_PUBLIC_KEY}
        onSuccess={handlePaymentSuccess}
        onCancel={handleClose}
      />
    );
  }

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={onClose}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Become an Oddity</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <Text style={styles.mainTitle}>Unlock Your Full Potential</Text>
              
              {/* Benefits List */}
              <View style={styles.benefitsContainer}>
                <View style={styles.benefitItem}>
                  <Ionicons name="school-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.benefitText}>
                    Organize all your classes (up to 9 courses)
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.benefitText}>
                    Plan your entire week (up to 30 tasks)
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.benefitText}>
                    Never forget a thing (up to 30 reminders)
                  </Text>
                </View>
              </View>

              {/* Price Display */}
              <View style={styles.priceContainer}>
                <Text style={styles.priceAmount}>{ODDITY_AMOUNT} GHS</Text>
                <Text style={styles.pricePeriod}>/ week</Text>
              </View>

              <Text style={styles.trustText}>
                Cancel anytime. Secure payment by Paystack.
              </Text>
            </View>
          </ScrollView>
          
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.ctaButton, (isProcessing || isPaying) && styles.ctaButtonDisabled]}
              onPress={handleUpgradePress}
              disabled={isProcessing || isPaying}>
              <Text style={styles.ctaButtonText}>
                {isProcessing ? 'Processing...' : isPaying ? 'Processing Payment...' : 'Become an Oddity'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <SuccessModal
        visible={showSuccess}
        onClose={handleSuccessClose}
        title="Welcome to Oddity!"
        subtitle="You now have access to all premium features. Start organizing your studies like never before!"
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textPrimary,
  },
  closeButton: {
    position: 'absolute',
    right: SPACING.lg,
    padding: SPACING.sm,
  },
  content: {
    flex: 1,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: SPACING.xxl,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  benefitText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
    flex: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.lg,
  },
  priceAmount: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.primary,
  },
  pricePeriod: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  trustText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footer: {
    padding: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ctaButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  ctaButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  ctaButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
  },
  paymentContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  paymentTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.textPrimary,
  },
});

export default AddOddityModal;
