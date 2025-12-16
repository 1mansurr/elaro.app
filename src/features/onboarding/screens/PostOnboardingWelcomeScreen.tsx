import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

const POST_ONBOARDING_WELCOME_KEY = 'hasSeenPostOnboardingWelcome';

export const PostOnboardingWelcomeScreen: React.FC = () => {
  const navigation = useNavigation<PostOnboardingWelcomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  const handleDismiss = async () => {
    try {
      // Mark that user has seen the post-onboarding welcome screen
      await AsyncStorage.setItem(POST_ONBOARDING_WELCOME_KEY, 'true');
    } catch (error) {
      console.error('Error saving post-onboarding welcome status:', error);
    }
    // Navigate to Main
    navigation.replace('Main');
  };

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
