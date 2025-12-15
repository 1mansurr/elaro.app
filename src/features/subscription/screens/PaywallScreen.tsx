import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import {
  PanGestureHandler,
  State,
  GestureHandlerGestureEvent,
  GestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
// Sentry is temporarily disabled
let Sentry: any = null;
try {
  Sentry = require('@sentry/react-native');
} catch (e) {
  // Sentry not available
}

import { PrimaryButton } from '@/shared/components';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
} from '@/constants/theme';
import { RootStackParamList } from '@/types/navigation';

const { width: screenWidth } = Dimensions.get('window');
const EDGE_SWIPE_THRESHOLD = 50;

type PaywallScreenRouteProp = RouteProp<RootStackParamList, 'PaywallScreen'>;
type PaywallScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PaywallScreen'
>;

export const PaywallScreen: React.FC = () => {
  const route = useRoute<PaywallScreenRouteProp>();
  const navigation = useNavigation<PaywallScreenNavigationProp>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  // Get params with defaults for backward compatibility
  const { variant = 'general', lockedContent } = route.params || {};
  const { user } = useAuth();
  // const { offerings, purchasePackage, isLoading, error } = useSubscription();
  const { purchasePackage, isLoading, error } = useSubscription();

  // Edge swipe gesture handlers
  const edgeSwipeTranslateX = useRef(new Animated.Value(0)).current;
  const edgeSwipeOpacity = useRef(new Animated.Value(1)).current;

  // Mock offerings for now
  const offerings = { current: null as any };

  // Benefits data based on your schema
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

  // Helper function to determine welcome screen variant (trial variants removed)
  const determineWelcomeVariant = async (
    userId: string | undefined,
  ): Promise<
    'direct' | 'renewal' | 'restore' | 'promo' | 'granted' | 'plan-change'
  > => {
    if (!userId) return 'direct'; // Fallback

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('subscription_status')
        .eq('id', userId)
        .single();

      if (error || !userData) {
        console.error(
          'Failed to fetch user data for variant detection:',
          error,
        );
        return 'direct'; // Fallback
      }

      const previousStatus = userData.subscription_status;

      // Check if this is a renewal (previously expired/canceled)
      if (previousStatus === 'expired' || previousStatus === 'canceled') {
        return 'renewal';
      }

      // Default to direct
      return 'direct';
    } catch (error) {
      console.error('Error determining welcome variant:', error);
      return 'direct'; // Fallback
    }
  };

  const handlePurchase = useCallback(async () => {
    if (!offerings?.current) {
      Alert.alert(
        'Error',
        'Subscription offerings are not available at the moment.',
      );
      return;
    }

    try {
      const oddityPackage = offerings.current.availablePackages.find(
        (pkg: any) => pkg.identifier === 'oddity_monthly',
      );

      if (!oddityPackage) {
        Alert.alert('Error', 'The Oddity plan is not available.');
        return;
      }

      await purchasePackage(oddityPackage);

      // Determine welcome screen variant and navigate
      const welcomeVariant = await determineWelcomeVariant(user?.id);
      navigation.navigate('OddityWelcomeScreen', { variant: welcomeVariant });
    } catch (error: any) {
      console.error('Purchase error:', error);

      // Handle different error types
      if (error.message?.includes('cancelled')) {
        // User cancelled - no need to show error
        return;
      }

      if (
        error.message?.includes('network') ||
        error.message?.includes('connection')
      ) {
        // User's fault - show friendly message
        Alert.alert(
          'Connection Issue',
          'Please check your internet connection and try again.',
          [{ text: 'OK' }],
        );
      } else {
        // Server error - log to Sentry if available and show user-friendly message
        if (Sentry?.captureException) {
          Sentry.captureException(error, {
            tags: {
              feature: 'paywall_purchase',
              variant: variant,
            },
          });
        }

        Alert.alert(
          'Something went wrong',
          "We've been notified and are fixing this issue. Please try again in a few minutes.",
          [{ text: 'OK' }],
        );
      }
    }
  }, [offerings, purchasePackage, variant, navigation, user]);

  const getTitle = () => {
    return variant === 'locked'
      ? 'Become an Oddity to Access This'
      : 'Become an Oddity';
  };

  const getSubtitle = () => {
    if (variant === 'locked' && lockedContent) {
      return `Unlock "${lockedContent}" and get access to all Oddity features`;
    }
    return 'Get unlimited access to all ELARO features';
  };

  const handleEdgeSwipe = (event: GestureHandlerGestureEvent) => {
    const { translationX } = event.nativeEvent;
    const tx = typeof translationX === 'number' ? translationX : 0;
    if (tx < -EDGE_SWIPE_THRESHOLD) {
      const progress = Math.min(1, Math.abs(tx) / screenWidth);
      edgeSwipeTranslateX.setValue(tx);
      edgeSwipeOpacity.setValue(1 - progress * 0.5);
    }
  };

  const handleEdgeSwipeEnd = (event: GestureHandlerStateChangeEvent) => {
    const { translationX } = event.nativeEvent;
    const tx = typeof translationX === 'number' ? translationX : 0;
    if (Math.abs(tx) > EDGE_SWIPE_THRESHOLD) {
      Animated.parallel([
        Animated.timing(edgeSwipeTranslateX, {
          toValue: -screenWidth,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(edgeSwipeOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        navigation.goBack();
        edgeSwipeTranslateX.setValue(0);
        edgeSwipeOpacity.setValue(1);
      });
    } else {
      Animated.parallel([
        Animated.spring(edgeSwipeTranslateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 7,
        }),
        Animated.spring(edgeSwipeOpacity, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
        }),
      ]).start();
    }
  };

  // Light mode default colors
  const isDark =
    theme.background === '#101922' || theme.background === '#0A0F14';
  const bgColor = isDark ? '#101922' : '#F6F7F8';
  const surfaceColor = isDark ? '#1C252E' : '#FFFFFF';

  return (
    <PanGestureHandler
      onGestureEvent={handleEdgeSwipe}
      onHandlerStateChange={handleEdgeSwipeEnd}
      activeOffsetX={-10}
      failOffsetY={[-10, 10]}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            backgroundColor: bgColor,
            paddingTop: insets.top,
            transform: [{ translateX: edgeSwipeTranslateX }],
            opacity: edgeSwipeOpacity,
          },
        ]}>
        <ScrollView
          style={[styles.container, { backgroundColor: bgColor }]}
          contentContainerStyle={styles.contentContainer}>
          {/* Hero Image Card */}
          <View style={[styles.heroCard, { backgroundColor: surfaceColor }]}>
            <Image
              source={require('../../../../assets/focus.png')}
              style={styles.heroImage}
              contentFit="contain"
            />
          </View>

          {/* Benefits Card */}
          <View
            style={[styles.benefitsCard, { backgroundColor: surfaceColor }]}>
            <Text style={[styles.benefitsTitle, { color: theme.text }]}>
              What you&apos;ll get with Oddity:
            </Text>

            <View style={styles.benefitsGrid}>
              {benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <View
                    style={[
                      styles.benefitIcon,
                      {
                        backgroundColor: benefit.color + (isDark ? '30' : '20'),
                      },
                    ]}>
                    <Ionicons
                      name={benefit.icon as any}
                      size={24}
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

          {/* CTA Card */}
          <View style={[styles.ctaCard, { backgroundColor: surfaceColor }]}>
            <PrimaryButton
              title="Become an Oddity for $1.99/month"
              onPress={handlePurchase}
              loading={isLoading}
              style={styles.purchaseButton}
            />

            <Text style={[styles.ctaSubtext, { color: theme.textSecondary }]}>
              Cancel anytime • No commitment required
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  animatedContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  heroCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  heroImage: {
    width: 200,
    height: 200,
  },
  benefitsCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  benefitsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  benefitItem: {
    width: '48%',
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.xs,
  },
  benefitDescription: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  ctaCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  purchaseButton: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  ctaSubtext: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
});

export default PaywallScreen;
