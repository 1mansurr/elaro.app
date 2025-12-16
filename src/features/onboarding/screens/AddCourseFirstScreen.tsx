import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '@/types/navigation';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from '@/constants/theme';

type AddCourseFirstScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AddCourseFirst'
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ADD_COURSE_FIRST_KEY = 'hasSeenAddCourseFirstScreen';
const POST_ONBOARDING_WELCOME_KEY = 'hasSeenPostOnboardingWelcome';

// Hero image from local assets
const HERO_IMAGE = require('../../../../assets/welhero1.png');

export const AddCourseFirstScreen: React.FC = () => {
  const navigation = useNavigation<AddCourseFirstScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  const handleAddCourse = async () => {
    try {
      // Mark that user has seen the AddCourseFirst screen
      await AsyncStorage.setItem(ADD_COURSE_FIRST_KEY, 'true');
    } catch (error) {
      console.error('Error saving AddCourseFirst status:', error);
    }
    // Navigate to AddCourseFlow
    navigation.navigate('AddCourseFlow');
  };

  const handleSkip = async () => {
    try {
      // Mark both screens as seen when user skips
      await AsyncStorage.multiSet([
        [ADD_COURSE_FIRST_KEY, 'true'],
        [POST_ONBOARDING_WELCOME_KEY, 'true'],
      ]);
    } catch (error) {
      console.error('Error saving skip status:', error);
    }
    // Navigate to Main
    navigation.replace('Main');
  };

  const maxImageWidth = Math.min(340, SCREEN_WIDTH - SPACING.xl * 2);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + SPACING.lg,
          paddingBottom: insets.bottom,
        },
      ]}>
      {/* Skip button */}
      <TouchableOpacity
        style={[styles.skipButton, { top: insets.top + SPACING.md }]}
        onPress={handleSkip}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        {/* Hero Image */}
        <View style={[styles.heroImageContainer, { width: maxImageWidth }]}>
          <View style={styles.imageWrapper}>
            <Image
              source={HERO_IMAGE}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            Let's get you <Text style={styles.titleHighlight}>organized</Text>
          </Text>
          <Text style={styles.subtitle}>
            Add a course to start tracking assignments, study sessions, and
            lectures.
          </Text>

          {/* Progress Dots */}
          <View style={styles.progressDots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Add Course Button */}
        <TouchableOpacity
          style={styles.addCourseButton}
          onPress={handleAddCourse}
          activeOpacity={0.9}>
          <Text style={styles.buttonText}>Add Course</Text>
        </TouchableOpacity>

        {/* Bottom Indicator */}
        <View style={styles.bottomIndicator} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
  },
  skipButton: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 1000,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  skipText: {
    fontSize: 15,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: SPACING.xxl,
  },
  heroImageContainer: {
    width: '100%',
    maxWidth: 340,
    marginBottom: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1, // Square container
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    width: '100%',
    maxWidth: 384, // max-w-sm equivalent
    alignItems: 'center',
    gap: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: FONT_WEIGHTS.extrabold as any,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  titleHighlight: {
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.normal as any,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.md,
    maxWidth: 300,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: SPACING.md,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB', // gray-200
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    // Ring effect (ring-2 ring-primary ring-offset-1)
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  bottomSection: {
    width: '100%',
    paddingBottom: SPACING.md,
    marginTop: 'auto',
  },
  addCourseButton: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  bottomIndicator: {
    width: 128, // w-32 equivalent
    height: 6, // h-1.5 equivalent
    backgroundColor: '#F3F4F6', // gray-100
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: SPACING.lg,
  },
});

export default AddCourseFirstScreen;

