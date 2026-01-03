/**
 * PostOnboardingWelcomeScreen
 *
 * ⚠️ SINGLE SOURCE OF TRUTH: This component is the ONLY authority on whether it should render.
 * DO NOT add visibility checks, guards, or business logic for this screen elsewhere.
 * This screen must not be guarded by parent components, navigation logic, or any other layer.
 *
 * This component enforces all business rules internally:
 * - Performs AsyncStorage visibility check once on mount
 * - Immediately redirects to Main if already seen (prevents accidental navigation)
 * - Renders nothing (loading state) before check completes
 * - Permanently marks itself as seen ONLY when user taps the X button
 * - Uses navigation.replace() to prevent screen from remaining in back stack
 * - Never appears as an initial route (enforced by parent navigator)
 * - Never depends on navigation focus or app startup effects
 *
 * The hasSeenPostOnboardingWelcome flag is written in exactly TWO places:
 * 1. This component's handleDismiss() - when user explicitly dismisses
 * 2. AddCourseFirstScreen's handleSkip() - when user explicitly skips (acceptable)
 *
 * Navigation safety:
 * - Always uses navigation.replace('Main') to exit (never push/navigate)
 * - Screen is in MODAL_FLOW_ROUTES (won't be restored on app restart)
 * - Tab bar is hidden via ROUTES_HIDING_TAB_BAR constant
 *
 * This screen is safe even if navigated to accidentally - it will check and redirect if needed.
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '@/types/navigation';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

type PostOnboardingWelcomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PostOnboardingWelcome'
>;

/**
 * SINGLE SOURCE OF TRUTH: This constant is the ONLY place where the storage key is defined.
 * All other files should import and reference this constant if they need the key for any reason.
 */
export const POST_ONBOARDING_WELCOME_KEY = 'hasSeenPostOnboardingWelcome';

export const PostOnboardingWelcomeScreen: React.FC = () => {
  const navigation = useNavigation<PostOnboardingWelcomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldShow, setShouldShow] = useState(false);
  // Track if check has been performed to ensure it only runs once
  const hasCheckedRef = useRef(false);

  // SINGLE SOURCE OF TRUTH: Check on mount if this screen should be shown
  // This is the ONLY place where the "hasSeenPostOnboardingWelcome" business rule is enforced
  // HARDENING: Use ref to ensure check only runs once, even if component re-renders
  useEffect(() => {
    // Prevent duplicate checks (defensive against re-renders)
    if (hasCheckedRef.current) {
      return;
    }
    hasCheckedRef.current = true;

    const checkShouldShow = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem(POST_ONBOARDING_WELCOME_KEY);

        // If user has already seen this screen, immediately redirect to Main
        // This prevents the screen from appearing even if navigated to accidentally
        if (hasSeen === 'true') {
          if (__DEV__) {
            console.log(
              '🚫 [PostOnboardingWelcomeScreen] User has already seen this screen. Redirecting to Main.',
            );
          }
          // HARDENING: Use replace to prevent back navigation to this screen
          // This ensures the screen never remains in the navigation back stack
          navigation.replace('Main');
          return;
        }

        // Screen should be shown - user hasn't seen it yet
        setShouldShow(true);
      } catch (error) {
        console.error(
          'Error checking post-onboarding welcome status:',
          error,
        );
        // On error, assume user has seen it (defensive: don't show)
        // This prevents the screen from appearing if there's a storage error
        navigation.replace('Main');
      } finally {
        setIsChecking(false);
      }
    };

    checkShouldShow();
    // Empty dependency array ensures this only runs once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // HARDENING: This is the ONLY place in this component where the flag is written
  // The flag is also written in AddCourseFirstScreen.handleSkip() when user explicitly skips
  // No other lifecycle, effect, or navigation event should set this flag
  const handleDismiss = async () => {
    try {
      // Permanently mark that user has seen the post-onboarding welcome screen
      // This is the ONLY place in this component where this flag is set
      await AsyncStorage.setItem(POST_ONBOARDING_WELCOME_KEY, 'true');
    } catch (error) {
      console.error('Error saving post-onboarding welcome status:', error);
      // Even if saving fails, navigate away to prevent user from being stuck
    }
    // HARDENING: Always use replace to prevent screen from remaining in back stack
    // This ensures the screen cannot be navigated back to under any condition
    navigation.replace('Main');
  };

  // HARDENING: Render nothing (loading state) before check completes
  // This prevents any content from flashing before we know if screen should be shown
  if (isChecking) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom },
        ]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // HARDENING: If shouldn't show, return null (will be redirected by useEffect)
  // This is a defensive guard in case redirect hasn't completed yet
  if (!shouldShow) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom },
      ]}>
      {/* Dismiss button */}
      <TouchableOpacity
        style={[styles.dismissButton, { top: insets.top + SPACING.md }]}
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={24} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {/* Illustration using Ionicons */}
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="calendar-outline" size={80} color={COLORS.primary} />
        </View>
        <View style={[styles.decorativeIcon, styles.decorativeIcon1]}>
          <Ionicons name="book-outline" size={32} color="#FF9500" />
        </View>
        <View style={[styles.decorativeIcon, styles.decorativeIcon2]}>
          <Ionicons name="pencil-outline" size={28} color="#34C759" />
        </View>
        <View style={[styles.decorativeIcon, styles.decorativeIcon3]}>
          <Ionicons name="bulb-outline" size={30} color="#FF3B30" />
        </View>
      </View>

      {/* Content */}
      <Text style={styles.title}>Start building Your Schedule</Text>
      <Text style={styles.subtitle}>
        Tap the + button below to add your first lecture, assignment, or study
        session.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
    overflow: 'visible', // Ensure X button isn't clipped
  },
  dismissButton: {
    position: 'absolute',
    right: SPACING.md,
    zIndex: 1000,
    padding: SPACING.xs,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  iconContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#F0F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#E0EBFF',
  },
  decorativeIcon: {
    position: 'absolute',
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  decorativeIcon1: {
    top: 20,
    right: 10,
  },
  decorativeIcon2: {
    bottom: 30,
    left: 10,
  },
  decorativeIcon3: {
    top: 80,
    right: -10,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
});

export default PostOnboardingWelcomeScreen;
