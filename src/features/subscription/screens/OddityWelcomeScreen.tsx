import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { DialogModal } from '@/shared/components/ModalVariants';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { supabase } from '@/services/supabase';
import { PrimaryButton } from '@/shared/components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { RootStackParamList } from '@/types/navigation';
import { useAuth } from '@/contexts/AuthContext';

type OddityWelcomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'OddityWelcomeScreen'
>;
type OddityWelcomeScreenRouteProp = RouteProp<
  RootStackParamList,
  'OddityWelcomeScreen'
>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const OddityWelcomeScreen = () => {
  const navigation = useNavigation<OddityWelcomeScreenNavigationProp>();
  const route = useRoute<OddityWelcomeScreenRouteProp>();
  const { user } = useAuth();
  const { variant } = route.params;

  const [isLoading, setIsLoading] = useState(false);
  const confettiRef = useRef<any>(null);

  // Fire confetti on mount
  useEffect(() => {
    // Only fire confetti for active variants, not placeholders
    const activeVariants = [
      'trial-early',
      'trial-expired',
      'direct',
      'renewal',
      'restore',
    ];
    if (activeVariants.includes(variant)) {
      confettiRef.current?.start();
    }
  }, [variant]);

  const handleContinue = async () => {
    setIsLoading(true);

    try {
      // Update last_welcome_shown_at in database
      if (user?.id) {
        const { error } = await supabase
          .from('users')
          .update({
            last_welcome_shown_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) {
          console.error('Failed to update last_welcome_shown_at:', error);
        }
      }

      // Navigate to Home screen
      navigation.navigate('Main');
    } catch (error) {
      console.error('Error in handleContinue:', error);
      // Still navigate even if database update fails
      navigation.navigate('Main');
    } finally {
      setIsLoading(false);
    }
  };

  // Benefits data
  const benefits = [
    {
      icon: 'school-outline',
      title: '10 Courses',
      description: 'vs 2 on free plan',
      color: 'COLORS.blue500',
    },
    {
      icon: 'flash-outline',
      title: '70 Activities/Month',
      description: 'vs 15 on free plan',
      color: 'COLORS.yellow500',
    },
    {
      icon: 'alarm-outline',
      title: '112 Spaced Repetition Reminders/Month',
      description: 'vs 15 on free plan',
      color: 'COLORS.green500',
    },
    {
      icon: 'analytics-outline',
      title: 'Weekly Analytics',
      description: 'Oddity exclusive',
      color: 'COLORS.purple500',
    },
  ];

  // Get variant-specific content
  const getContent = () => {
    switch (variant) {
      case 'trial-early':
      case 'trial-expired':
        return {
          headline: 'Congratulations!',
          subheadline: "You're now An Oddity",
          benefitsPrefix: 'You now have access to',
          showConfetti: true,
        };

      case 'direct':
        return {
          headline: 'Welcome!',
          subheadline: "You're now An Oddity",
          benefitsPrefix: 'You now have access to',
          showConfetti: true,
        };

      case 'renewal':
        return {
          headline: 'Welcome back!',
          subheadline: "You're an Oddity Once again",
          benefitsPrefix: 'You have access to',
          showConfetti: true,
        };

      case 'restore':
        return {
          headline: 'Your membership has been restored!',
          subheadline: "You're now An Oddity again",
          benefitsPrefix: 'You have access to',
          showConfetti: true,
        };

      // Placeholder variants (show generic fallback)
      case 'promo':
      case 'granted':
      case 'plan-change':
      default:
        return {
          headline: "You're now An Oddity",
          subheadline: null,
          benefitsPrefix: null,
          showConfetti: false,
        };
    }
  };

  const content = getContent();
  const isPlaceholderVariant = ['promo', 'granted', 'plan-change'].includes(
    variant,
  );

  // Generic fallback for placeholders
  if (isPlaceholderVariant) {
    return (
      <DialogModal isVisible={true} onClose={handleContinue}>
        <View style={styles.genericContainer}>
          <Text style={styles.genericTitle}>{content.headline}</Text>
          <PrimaryButton
            title="Continue"
            onPress={handleContinue}
            loading={isLoading}
          />
        </View>
      </DialogModal>
    );
  }

  // Full welcome screen for active variants
  return (
    <DialogModal isVisible={true} onClose={handleContinue}>
      {/* Confetti (full screen) */}
      {content.showConfetti && (
        <ConfettiCannon
          ref={confettiRef}
          count={200}
          origin={{ x: SCREEN_WIDTH / 2, y: 0 }}
          autoStart={false}
          fadeOut={true}
          fallSpeed={2500}
          explosionSpeed={350}
        />
      )}

      {/* Blurred background */}
      <View style={styles.overlay}>
        {/* Modal container (70% width, 70% height, centered) */}
        <View style={styles.modalContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Header Section */}
            <View style={styles.headerSection}>
              <Text style={styles.headline}>{content.headline}</Text>
              <Text style={styles.subheadline}>{content.subheadline}</Text>
            </View>

            {/* Benefits Section */}
            <View style={styles.benefitsSection}>
              <Text style={styles.benefitsTitle}>
                {content.benefitsPrefix}:
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
                      size={20}
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

            {/* Continue Button */}
            <View style={styles.buttonContainer}>
              <PrimaryButton
                title="Continue"
                onPress={handleContinue}
                loading={isLoading}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </DialogModal>
  );
};

const styles = StyleSheet.create({
  // Full welcome screen styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_HEIGHT * 0.7,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: 'COLORS.black',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headline: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subheadline: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.primary,
    textAlign: 'center',
  },
  benefitsSection: {
    marginBottom: SPACING.lg,
  },
  benefitsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    color: COLORS.text,
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray,
  },
  buttonContainer: {
    marginTop: SPACING.md,
  },

  // Generic fallback styles
  genericOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genericContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SPACING.xl,
    margin: SPACING.lg,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: 'COLORS.black',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  genericTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
});

export default OddityWelcomeScreen;
