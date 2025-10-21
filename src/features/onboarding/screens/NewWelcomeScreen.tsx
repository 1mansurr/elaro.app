import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import ConfettiCannon from 'react-native-confetti-cannon';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/shared/components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

type ScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Welcome'>;

const NewWelcomeScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { onboardingData, updateOnboardingData } = useOnboarding();

  const [dateOfBirth, setDateOfBirth] = useState<Date>(
    onboardingData.dateOfBirth ? new Date(onboardingData.dateOfBirth) : new Date(2000, 0, 1)
  );
  const [hasParentalConsent, setHasParentalConsent] = useState(onboardingData.hasParentalConsent);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  // Calculate age from date of birth
  const age = useMemo(() => {
    const today = new Date();
    let calculatedAge = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      calculatedAge--;
    }
    
    return calculatedAge;
  }, [dateOfBirth]);

  // Format date for display
  const formattedDate = dateOfBirth.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Determine if user is under 13
  const isUnder13 = age < 13;

  // Determine if user needs parental consent (13-17)
  const needsParentalConsent = age >= 13 && age < 18;

  // Check if continue button should be enabled
  const canContinue = age >= 13 && (!needsParentalConsent || hasParentalConsent);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handleNext = () => {
    if (!canContinue) return;

    // Format date as YYYY-MM-DD for backend
    const formattedDateOfBirth = dateOfBirth.toISOString().split('T')[0];
    
    updateOnboardingData({
      dateOfBirth: formattedDateOfBirth,
      hasParentalConsent,
    });
    
    navigation.navigate('ProfileSetup');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {showConfetti && (
        <ConfettiCannon
          count={200}
          origin={{ x: -10, y: 0 }}
          autoStart={true}
          fadeOut={true}
          explosionSpeed={400}
        />
      )}
      
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome to ELARO!</Text>
        <Text style={styles.welcomeSubtitle}>
          Let's set up your academic co-pilot in just a few quick steps.
        </Text>
      </View>

      {/* Age Verification Section */}
      <View style={styles.ageSection}>
        <Text style={styles.sectionTitle}>Age Verification</Text>
        <Text style={styles.sectionSubtitle}>
          We need to verify your age to ensure a safe and appropriate experience.
        </Text>

        <View style={styles.dateSection}>
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>{formattedDate}</Text>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dateOfBirth}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
            />
          )}

          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Show age information */}
        <View style={styles.ageContainer}>
          <Text style={styles.ageText}>Your age: {age} years old</Text>
        </View>

        {/* Error message for users under 13 */}
        {isUnder13 && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Sorry, you must be at least 13 years old to use this service.
            </Text>
          </View>
        )}

        {/* Parental consent checkbox for users 13-17 */}
        {needsParentalConsent && !isUnder13 && (
          <View style={styles.consentContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setHasParentalConsent(!hasParentalConsent)}
            >
              <View style={[styles.checkbox, hasParentalConsent && styles.checkboxChecked]}>
                {hasParentalConsent && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.consentText}>
                I have parental consent to use this service
              </Text>
            </TouchableOpacity>
            <Text style={styles.consentSubtext}>
              Users under 18 require parental consent to create an account.
            </Text>
          </View>
        )}

        {/* Info text for users 18+ */}
        {age >= 18 && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              You're all set! No additional consent is required.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Continue"
          onPress={handleNext}
          disabled={!canContinue}
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
  welcomeSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  welcomeTitle: {
    fontWeight: FONT_WEIGHTS.bold as any,
    fontSize: FONT_SIZES.xxl,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  welcomeSubtitle: {
    fontWeight: FONT_WEIGHTS.normal as any,
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  ageSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    color: COLORS.gray,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  dateSection: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    marginBottom: SPACING.sm,
    color: COLORS.text,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  changeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  doneButton: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  ageContainer: {
    backgroundColor: '#e3f2fd',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  ageText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: '#1976d2',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    color: '#c62828',
    textAlign: 'center',
    lineHeight: 20,
  },
  consentContainer: {
    marginBottom: SPACING.md,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold as any,
  },
  consentText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    flex: 1,
    lineHeight: 20,
  },
  consentSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginLeft: 36,
    lineHeight: 18,
  },
  infoContainer: {
    backgroundColor: '#e8f5e9',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: '#2e7d32',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: SPACING.lg,
  },
});

export default NewWelcomeScreen;

