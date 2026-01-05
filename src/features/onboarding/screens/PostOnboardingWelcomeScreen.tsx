/**
 * PostOnboardingWelcomeScreen
 *
 * ⚠️ STRICT RENDER CONTRACT: This component enforces a hard render guard.
 * It will NEVER render UI unless ALL conditions are met.
 *
 * Render conditions (canRenderWelcome):
 * - User has completed onboarding
 * - User has NOT seen post-onboarding welcome (AsyncStorage check)
 * - Welcome has NOT been dismissed in this session
 *
 * If ANY condition fails, component returns null immediately (no JSX rendered).
 * Navigation is optional - render guard handles visibility, not navigation.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isChecking, setIsChecking] = useState(true);
  const [hasSeenInStorage, setHasSeenInStorage] = useState<boolean | null>(
    null,
  );
  const [dismissedInSession, setDismissedInSession] = useState(false);

  // STRICT RENDER CONTRACT: Check AsyncStorage once on mount
  useEffect(() => {
    const checkStorage = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem(POST_ONBOARDING_WELCOME_KEY);
        const hasSeenValue =
          hasSeen === 'true' || hasSeen === '1' || hasSeen === 'yes';
        setHasSeenInStorage(hasSeenValue);

        if (__DEV__) {
          console.log('🔍 [PostOnboardingWelcomeScreen] Storage check:', {
            hasSeen,
            hasSeenValue,
            userOnboardingCompleted: user?.onboarding_completed,
          });
        }
      } catch (error) {
        console.error('Error checking post-onboarding welcome status:', error);
        // On error, assume user has seen it (defensive: don't show)
        setHasSeenInStorage(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // STRICT RENDER CONTRACT: Compute canRenderWelcome
  // This is the ONLY condition that determines if UI should render
  const canRenderWelcome = (() => {
    // Still checking - don't render yet
    if (isChecking || hasSeenInStorage === null) {
      return false;
    }

    // User has dismissed in this session - never render
    if (dismissedInSession) {
      return false;
    }

    // User has seen it in storage - never render
    if (hasSeenInStorage === true) {
      return false;
    }

    // User must have completed onboarding
    if (!user?.onboarding_completed) {
      return false;
    }

    // All conditions met - can render
    return true;
  })();

  // HARD RENDER GUARD: Return null immediately if cannot render
  // This happens BEFORE any JSX is rendered
  if (!canRenderWelcome) {
    return null;
  }

  // STRICT RENDER CONTRACT: Handle dismiss
  // Updates storage and local state immediately so component unmounts visually
  const handleDismiss = async () => {
    try {
      // Permanently mark that user has seen the post-onboarding welcome screen
      await AsyncStorage.setItem(POST_ONBOARDING_WELCOME_KEY, 'true');
      // Update local state immediately - this makes canRenderWelcome false
      // Component will unmount visually immediately
      setDismissedInSession(true);
      setHasSeenInStorage(true);

      if (__DEV__) {
        console.log(
          '✅ [PostOnboardingWelcomeScreen] Dismissed - updating state to unmount',
        );
      }
    } catch (error) {
      console.error('Error saving post-onboarding welcome status:', error);
      // Even if saving fails, update local state to hide immediately
      setDismissedInSession(true);
    }

    // Optional: Navigate away (not required for hiding - render guard handles it)
    // Navigation is a convenience, not a requirement
    try {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'Main',
              state: {
                routes: [{ name: 'Home' }],
                index: 0,
              },
            },
          ],
        }),
      );
    } catch (navError) {
      // Navigation error is non-critical - render guard already hides the screen
      if (__DEV__) {
        console.warn('Navigation error (non-critical):', navError);
      }
    }
  };

  // Only reached if canRenderWelcome is true
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
