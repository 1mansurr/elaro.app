import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '@/types/navigation';
import { PrimaryButton } from '@/shared/components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

type AppWelcomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AppWelcome'
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const benefits = [
  {
    icon: 'book-outline' as const,
    title: 'Study Sessions',
    description: 'Turn scattered effort into steady progress',
    color: COLORS.blue500,
  },
  {
    icon: 'refresh-outline' as const,
    title: 'Revision Reminders',
    description: 'Remember more with less effort',
    color: COLORS.purple500,
  },
  {
    icon: 'calendar-outline' as const,
    title: 'Lecture Reminders',
    description: 'Walk into every class prepared',
    color: COLORS.green500,
  },
  {
    icon: 'school-outline' as const,
    title: 'Assignment Reminders',
    description: 'Stay ahead of deadlines without stress',
    color: COLORS.orange500,
  },
];

const AppWelcomeScreen = () => {
  const navigation = useNavigation<AppWelcomeScreenNavigationProp>();

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
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.welcomeTitle}>Welcome to ELARO</Text>
          <Text style={styles.welcomeSubtitle}>
            Your academic co-pilot for better study habits and academic success
          </Text>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          {benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitCard}>
              <View
                style={[
                  styles.benefitIconContainer,
                  { backgroundColor: benefit.color + '20' },
                ]}>
                <Ionicons name={benefit.icon} size={28} color={benefit.color} />
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

        {/* CTA Button */}
        <View style={styles.buttonContainer}>
          <PrimaryButton
            title="Get Started"
            onPress={handleGetStarted}
            style={styles.getStartedButton}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.xxl * 2,
    paddingBottom: SPACING.xxl,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxl * 2,
  },
  welcomeTitle: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.normal as any,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: SCREEN_WIDTH * 0.85,
  },
  benefitsSection: {
    marginBottom: SPACING.xxl,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: 16,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  benefitIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  benefitDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  getStartedButton: {
    width: '100%',
  },
});

export default AppWelcomeScreen;


