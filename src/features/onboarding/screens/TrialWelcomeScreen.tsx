import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { PrimaryButton } from '@/shared/components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { RootStackParamList } from '@/types/navigation';
// Sentry is temporarily disabled
let Sentry: any = null;
try {
  Sentry = require('@sentry/react-native');
} catch (e) {
  // Sentry not available
}

type ScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const TrialWelcomeScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);

    try {
      // Start the user's trial
      const { error } = await supabase.functions.invoke('start-user-trial');

      if (error) {
        console.error('Failed to start trial:', error);
        // Log to Sentry for monitoring if available
        if (Sentry?.captureException) {
          Sentry.captureException(error, {
            tags: {
              feature: 'trial_welcome',
              action: 'start_trial',
            },
          });
        }
      }

      // Navigate to main app regardless of trial start success/failure
      navigation.navigate('Main');
    } catch (error) {
      console.error('Unexpected error starting trial:', error);
      // Log to Sentry if available
      if (Sentry?.captureException) {
        Sentry.captureException(error, {
          tags: {
            feature: 'trial_welcome',
            action: 'start_trial_unexpected',
          },
        });
      }

      // Still navigate to main app
      navigation.navigate('Main');
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    {
      icon: 'school-outline',
      title: 'More Courses',
      description: 'Track up to 10 courses (vs 2 on free plan)',
      color: 'COLORS.blue500',
    },
    {
      icon: 'flash-outline',
      title: 'More Tasks',
      description: 'Create 70 tasks/month (vs 15 on free plan)',
      color: 'COLORS.yellow500',
    },
    {
      icon: 'alarm-outline',
      title: 'More Reminders',
      description: 'Get 112 SRS reminders/month (vs 15 on free plan)',
      color: 'COLORS.green500',
    },
    {
      icon: 'analytics-outline',
      title: 'Weekly Analytics',
      description: 'Advanced study insights and performance tracking',
      color: 'COLORS.purple500',
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.title}>Welcome to ELARO!</Text>
        <Text style={styles.subtitle}>
          🎉 We&apos;re giving you a 7-day free trial of our premium Oddity
          experience!
        </Text>
        <Text style={styles.giftText}>
          No credit card required • Experience everything ELARO has to offer
        </Text>
      </View>

      {/* Benefits Grid */}
      <View style={styles.benefitsSection}>
        <Text style={styles.benefitsTitle}>
          What you&apos;ll get with Oddity:
        </Text>

        {benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitCard}>
            <View
              style={[
                styles.benefitIcon,
                { backgroundColor: benefit.color + '20' },
              ]}>
              <Ionicons
                name={benefit.icon as any}
                size={24}
                color={benefit.color}
              />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitDescription}>
                {benefit.description}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Pricing Info */}
      <View style={styles.pricingSection}>
        <Text style={styles.pricingText}>
          After your 7-day trial, continue with Oddity for just $1.99/month
        </Text>
        <Text style={styles.pricingSubtext}>
          Cancel anytime • No commitment required
        </Text>
      </View>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <PrimaryButton
          title="Continue"
          onPress={handleContinue}
          loading={isLoading}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    lineHeight: 24,
  },
  giftText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  benefitsSection: {
    marginBottom: SPACING.xl,
  },
  benefitsTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: 'COLORS.black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  benefitDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    lineHeight: 18,
  },
  pricingSection: {
    backgroundColor: '#f0f9ff',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  pricingText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.blue900,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  pricingSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.blue600,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: SPACING.lg,
  },
});

export default TrialWelcomeScreen;
