import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '@/types/navigation';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  SHADOWS,
  BORDER_RADIUS,
} from '@/constants/theme';

type AppWelcomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AppWelcome'
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Hero image from local assets
const HERO_IMAGE = require('@/assets/welhero.png');

const features = [
  {
    icon: 'timer-outline' as const,
    title: 'Study Sessions',
    description: 'Plan focused blocks',
    color: '#3b82f6', // accent-blue
    bgColor: '#dbeafe', // blue-100
  },
  {
    icon: 'refresh-outline' as const,
    title: 'Revisions',
    description: 'Never forget topics',
    color: '#8b5cf6', // accent-purple
    bgColor: '#f3e8ff', // purple-100
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Lecture Alerts',
    description: 'Be on time, always',
    color: '#22c55e', // accent-green
    bgColor: '#dcfce7', // green-100
  },
  {
    icon: 'document-text-outline' as const,
    title: 'Assignments',
    description: 'Track deadlines',
    color: '#f97316', // accent-orange
    bgColor: '#ffedd5', // orange-100
  },
];

const AppWelcomeScreen = () => {
  const navigation = useNavigation<AppWelcomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  const handleGetStarted = async () => {
    try {
      // Mark that user has seen welcome screen
      await AsyncStorage.setItem('hasSeenWelcomeScreen', 'true');
    } catch (error) {
      console.error('Error saving welcome screen status:', error);
    }
    navigation.replace('Auth', { mode: 'signup' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ELARO Logo Header */}
        <View style={styles.logoHeader}>
          <View style={styles.logoContainer}>
            <Ionicons name="school" size={32} color={COLORS.primary} />
            <Text style={[styles.logoText, { marginLeft: SPACING.xs }]}>
              ELARO
            </Text>
          </View>
        </View>

        {/* Welcome Title Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome to ELARO</Text>
          <Text style={styles.welcomeSubtitle}>
            Your academic co-pilot for smarter study and success!
          </Text>
        </View>

        {/* Hero Image */}
        <View style={styles.heroImageContainer}>
          <ImageBackground
            source={HERO_IMAGE}
            style={styles.heroImage}
            imageStyle={styles.heroImageStyle}>
            <LinearGradient
              colors={['transparent', 'rgba(44, 94, 255, 0.2)']}
              style={styles.heroGradient}
            />
          </ImageBackground>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View
                style={[
                  styles.featureIconContainer,
                  { backgroundColor: feature.bgColor },
                ]}>
                <Ionicons name={feature.icon} size={24} color={feature.color} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text
                  style={[
                    styles.featureDescription,
                    { marginTop: SPACING.xs },
                  ]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View
        style={[
          styles.fixedButtonContainer,
          { paddingBottom: Math.max(insets.bottom, SPACING.md) },
        ]}>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.9}>
          <Text style={styles.buttonText}>Get Started</Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color={COLORS.white}
            style={{ marginLeft: SPACING.xs }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7f8', // background-light
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Space for fixed button
  },
  logoHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.extrabold as any,
    color: '#111518', // text-main
    letterSpacing: -0.5,
  },
  welcomeSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: FONT_WEIGHTS.extrabold as any,
    color: '#111518', // text-main
    textAlign: 'center',
    marginBottom: SPACING.md,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: '#617789', // text-secondary
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: SCREEN_WIDTH * 0.7,
  },
  heroImageContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    width: '100%',
    alignItems: 'center',
  },
  heroImage: {
    width: '100%',
    height: 192, // h-48 equivalent
    borderRadius: BORDER_RADIUS.xl * 2,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  heroImageStyle: {
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  featureCard: {
    width: (SCREEN_WIDTH - SPACING.md * 3) / 2, // 2 columns with gaps
    backgroundColor: COLORS.white, // card-light
    borderRadius: BORDER_RADIUS.xl * 2,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#f3f4f6', // gray-100
    ...SHADOWS.sm,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    marginTop: SPACING.md,
  },
  featureTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: '#111518', // text-main
    lineHeight: 18,
  },
  featureDescription: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: '#617789', // text-secondary
    lineHeight: 16,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    backgroundColor: 'rgba(246, 247, 248, 0.95)', // background-light with opacity
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6', // gray-100
  },
  getStartedButton: {
    width: '100%',
    height: 48,
    backgroundColor: COLORS.primary, // Use app's primary color
    borderRadius: BORDER_RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
  },
  buttonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.white,
  },
});

export default AppWelcomeScreen;
