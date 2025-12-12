import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/shared/components';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
} from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { getOfferingsWithRecovery } from '@/utils/revenueCatRecovery';
import { PurchasesPackageType as PurchasesPackage } from '@/services/revenueCatWrapper';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.4; // 40% of screen height

export type LimitType = 'course' | 'activity' | 'reminder';

interface UsageLimitPaywallProps {
  isVisible: boolean;
  onClose: () => void;
  limitType: LimitType;
  currentUsage: number;
  maxLimit: number;
  actionLabel: string; // e.g., "Add 3rd Course"
  onUpgradeSuccess?: () => void;
}

export const UsageLimitPaywall: React.FC<UsageLimitPaywallProps> = ({
  isVisible,
  onClose,
  limitType,
  currentUsage,
  maxLimit,
  actionLabel,
  onUpgradeSuccess,
}) => {
  const { purchasePackage, isLoading } = useSubscription();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [errorCount, setErrorCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getLimitMessage = () => {
    switch (limitType) {
      case 'course':
        return `You've reached your limit of ${maxLimit} courses.`;
      case 'activity':
        return `You've used ${currentUsage}/${maxLimit} activities this month.`;
      case 'reminder':
        return `You've used ${currentUsage}/${maxLimit} reminders this month.`;
    }
  };

  const getLimitIcon = () => {
    switch (limitType) {
      case 'course':
        return 'school-outline';
      case 'activity':
        return 'flash-outline';
      case 'reminder':
        return 'alarm-outline';
    }
  };

  const benefits = [
    {
      icon: 'school-outline',
      title: '10 Courses',
      description: 'vs 2 on free plan',
      color: COLORS.primary,
    },
    {
      icon: 'flash-outline',
      title: '70 Activities/Month',
      description: 'vs 15 on free plan',
      color: COLORS.secondary,
    },
    {
      icon: 'alarm-outline',
      title: '50 Spaced Repetition Reminders/Month',
      description: 'vs 5 on free plan',
      color: COLORS.success,
    },
    {
      icon: 'analytics-outline',
      title: 'Weekly Analytics',
      description: 'Oddity exclusive',
      color: COLORS.accent,
    },
  ];

  const handleUpgrade = useCallback(async () => {
    setErrorMessage(null);
    
    try {
      // Get offerings with recovery strategy
      const offerings = await getOfferingsWithRecovery();
      
      if (!offerings) {
        throw new Error('Subscription offerings are not available at the moment.');
      }

      const oddityPackage = offerings.availablePackages.find(
        (pkg: PurchasesPackage) => pkg.identifier === 'oddity_monthly',
      );

      if (!oddityPackage) {
        throw new Error('The Oddity plan is not available.');
      }

      await purchasePackage(oddityPackage);
      
      // Reset error count on success
      setErrorCount(0);
      
      // Call success callback
      if (onUpgradeSuccess) {
        onUpgradeSuccess();
      }
      
      // Close the paywall
      onClose();
    } catch (error: any) {
      const newErrorCount = errorCount + 1;
      setErrorCount(newErrorCount);

      if (error.message?.includes('cancelled') || error.code === 'PURCHASES_ERROR_PURCHASE_CANCELLED') {
        // User cancelled - no need to show error
        return;
      }

      if (newErrorCount >= 2) {
        // Show error message after 2 failures
        setErrorMessage(
          error.message ||
            'Something went wrong. Please try again or contact support.',
        );
      }
    }
  }, [purchasePackage, errorCount, onUpgradeSuccess, onClose]);

  const handleRetry = useCallback(() => {
    setErrorCount(0);
    setErrorMessage(null);
    handleUpgrade();
  }, [handleUpgrade]);

  const percentage = Math.min((currentUsage / maxLimit) * 100, 100);

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="slide"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>
      <View style={styles.sheetContainer}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: COLORS.primary + '20' },
              ]}>
              <Ionicons
                name={getLimitIcon() as any}
                size={24}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.text }]}>
                Upgrade to Continue
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {actionLabel}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons
              name="close-outline"
              size={28}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}>
          {/* Usage Card */}
          <View
            style={[
              styles.usageCard,
              {
                backgroundColor: theme.isDark ? '#1C252E' : '#FFFFFF',
                borderColor: theme.border,
              },
            ]}>
            <Text style={[styles.limitMessage, { color: theme.text }]}>
              {getLimitMessage()}
            </Text>
            <View
              style={[
                styles.usageBar,
                {
                  backgroundColor: theme.isDark ? '#374151' : '#F3F4F6',
                },
              ]}>
              <View
                style={[
                  styles.usageFill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: COLORS.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.usageText, { color: theme.textSecondary }]}>
              {currentUsage} / {maxLimit} used
            </Text>
          </View>

          {/* Benefits Section */}
          <View style={styles.benefitsSection}>
            <Text style={[styles.benefitsTitle, { color: theme.text }]}>
              What you'll get with Oddity:
            </Text>
            <View style={styles.benefitsGrid}>
              {benefits.map((benefit, index) => (
                <View
                  key={index}
                  style={[
                    styles.benefitItem,
                    {
                      backgroundColor: theme.isDark ? '#1C252E' : '#FFFFFF',
                      borderColor: theme.border,
                    },
                  ]}>
                  <View
                    style={[
                      styles.benefitIcon,
                      { backgroundColor: benefit.color + '20' },
                    ]}>
                    <Ionicons
                      name={benefit.icon as any}
                      size={20}
                      color={benefit.color}
                    />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={[styles.benefitTitle, { color: theme.text }]}>
                      {benefit.title}
                    </Text>
                    <Text
                      style={[
                        styles.benefitDescription,
                        { color: theme.textSecondary },
                      ]}>
                      {benefit.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Error Message */}
          {errorMessage && (
            <View
              style={[
                styles.errorCard,
                {
                  backgroundColor: COLORS.error + '10',
                  borderColor: COLORS.error + '30',
                },
              ]}>
              <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
              <Text style={[styles.errorText, { color: COLORS.error }]}>
                {errorMessage}
              </Text>
              <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.isDark ? '#101922' : '#F6F7F8',
              borderTopColor: theme.border,
            },
          ]}>
          <PrimaryButton
            title="Become an Oddity for $1.99/month"
            onPress={handleUpgrade}
            loading={isLoading}
            style={styles.upgradeButton}
          />
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Cancel anytime • No commitment required
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    marginBottom: SPACING.xs / 2,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
  },
  usageCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  limitMessage: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  usageBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    borderRadius: 4,
  },
  usageText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  benefitsSection: {
    marginBottom: SPACING.md,
  },
  benefitsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold as any,
    marginBottom: SPACING.sm,
  },
  benefitsGrid: {
    gap: SPACING.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: FONT_SIZES.xs,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  errorText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
  },
  retryButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.error,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
  },
  upgradeButton: {
    width: '100%',
    marginBottom: SPACING.xs,
  },
  footerText: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
  },
});

