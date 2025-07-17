import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useSoftLaunch } from '../../contexts/SoftLaunchContext';
import { PLANS } from '../../types';

interface PlanCardProps {
  isSubscribed: boolean;
  isUpgrading: boolean;
  onUpgrade: () => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  isSubscribed,
  isUpgrading,
  onUpgrade,
}) => {
  const { showComingSoonModal } = useSoftLaunch();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleManagePlan = () => {
    showComingSoonModal('subscription');
  };

  return (
    <View style={styles.container}>
      {isSubscribed ? (
        <View style={[styles.oddityCard, { backgroundColor: isDark ? COLORS.gray900 : COLORS.purple50 }]}> 
          <View style={styles.planHeader}>
            <View style={styles.badgeContainer}>
              <Ionicons name="star" size={16} color={isDark ? COLORS.purple200 : COLORS.purple600} />
              <Text style={[styles.planBadge, { color: isDark ? COLORS.purple200 : COLORS.purple600 }]}>ODDITY</Text>
            </View>
            <Text style={[styles.planStatus, { color: isDark ? COLORS.white : COLORS.purple600, backgroundColor: isDark ? COLORS.purple800 : COLORS.purple100 }]}>Active</Text>
          </View>
          <Text style={[styles.planDescription, { color: isDark ? COLORS.gray100 : COLORS.text }]}>You're unlocking your full potential with premium study planning</Text>
          <View style={styles.featureList}>
            <Text style={[styles.featureItem, { color: isDark ? COLORS.purple200 : COLORS.purple600 }]}>• 35 active tasks/events</Text>
            <Text style={[styles.featureItem, { color: isDark ? COLORS.purple200 : COLORS.purple600 }]}>• 75 spaced reminders</Text>
            <Text style={[styles.featureItem, { color: isDark ? COLORS.purple200 : COLORS.purple600 }]}>• Full guide access</Text>
          </View>
          <Pressable 
            style={[styles.manageButton, { backgroundColor: isDark ? COLORS.purple800 : COLORS.purple100 }]}
            onPress={handleManagePlan}
            accessibilityRole="button"
            accessibilityLabel="Manage subscription plan"
          >
            <Text style={[styles.manageButtonText, { color: isDark ? COLORS.white : COLORS.purple600 }]}>Manage Plan</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.freeCard}>
          <View style={styles.planHeader}>
            <View style={styles.badgeContainer}>
              <Ionicons name="cube-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.freePlanBadge}>ORIGIN</Text>
            </View>
            <Text style={styles.freeStatus}>Free Plan</Text>
          </View>
          <Text style={[styles.planDescription, { color: COLORS.text }]}>
            You're getting started with the basics
          </Text>
          <View style={styles.featureList}>
            <Text style={[styles.featureItem, { color: COLORS.text }]}>• Up to 14 tasks/week</Text>
            <Text style={[styles.featureItem, { color: COLORS.text }]}>• Up to {PLANS.origin.srLimit} spaced repetition reminders</Text>
          </View>
          <Pressable
            style={[styles.upgradeButton, { backgroundColor: COLORS.primary, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, alignItems: 'center' }]}
            onPress={onUpgrade}
            disabled={isUpgrading}
            accessibilityRole="button"
            accessibilityLabel="Become an Oddity"
            accessibilityState={{ disabled: isUpgrading }}
          >
            <Text style={[styles.upgradeButtonText, { color: COLORS.white, fontSize: FONT_SIZES.lg }]}>🚀 Become an Oddity</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  oddityCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.lg,
  },
  premiumGradient: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  freeCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  planBadge: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.white,
  },
  freePlanBadge: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textSecondary,
  },
  planStatus: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.white,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  freeStatus: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  planDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    marginBottom: SPACING.md,
    lineHeight: FONT_SIZES.md * 1.4,
  },
  featureList: {
    marginBottom: SPACING.lg,
  },
  featureItem: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  manageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  manageButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.white,
  },
  upgradeButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  upgradeGradient: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  upgradePrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.9,
  },
}); 