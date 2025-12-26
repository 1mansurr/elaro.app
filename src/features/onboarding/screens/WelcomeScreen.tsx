import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import ConfettiCannon from 'react-native-confetti-cannon';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/shared/components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { formatDate } from '@/i18n';

type ScreenNavigationProp = StackNavigationProp<
  OnboardingStackParamList,
  'Welcome'
>;

const WelcomeScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { onboardingData, updateOnboardingData } = useOnboarding();

  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(
    onboardingData.dateOfBirth ? new Date(onboardingData.dateOfBirth) : null,
  );
  const [hasParentalConsent, setHasParentalConsent] = useState(
    onboardingData.hasParentalConsent,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  // Calculate age from date of birth
  const age = useMemo(() => {
    if (!dateOfBirth) return null;

    const today = new Date();
    let calculatedAge = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
    ) {
      calculatedAge--;
    }

    return calculatedAge;
  }, [dateOfBirth]);

  // Format date for display
  const formattedDate = dateOfBirth
    ? formatDate(dateOfBirth, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Select your birthdate';

  // Determine if user is under 13
  const isUnder13 = age !== null && age < 13;

  // Determine if user needs parental consent (13-17)
  const needsParentalConsent = age !== null && age >= 13 && age < 18;

  // Check if continue button should be enabled
  const canContinue =
    age !== null && age >= 13 && (!needsParentalConsent || hasParentalConsent);

  // Helper function to safely navigate - ensures navigation is ready
  const safeNavigate = (routeName: 'ProfileSetup') => {
    try {
      // Check if navigation object exists and has navigate method
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate(routeName);
      } else {
        // Retry after a delay if navigation isn't ready
        setTimeout(() => {
          if (navigation && typeof navigation.navigate === 'function') {
            navigation.navigate(routeName);
          }
        }, 300);
      }
    } catch (error) {
      // If navigation fails, retry after a delay
      console.warn('Navigation not ready, retrying...', error);
      setTimeout(() => {
        try {
          if (navigation && typeof navigation.navigate === 'function') {
            navigation.navigate(routeName);
          }
        } catch (retryError) {
          console.error('Navigation retry failed:', retryError);
        }
      }, 500);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);

      // For Android: Check if user is 18+ and auto-navigate
      if (selectedDate) {
        const today = new Date();
        let calculatedAge = today.getFullYear() - selectedDate.getFullYear();
        const monthDiff = today.getMonth() - selectedDate.getMonth();

        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < selectedDate.getDate())
        ) {
          calculatedAge--;
        }

        setDateOfBirth(selectedDate);

        // If 18+, auto-navigate to ProfileSetup
        if (calculatedAge >= 18) {
          const formattedDateOfBirth = selectedDate.toISOString().split('T')[0];
          updateOnboardingData({
            dateOfBirth: formattedDateOfBirth,
            hasParentalConsent: false,
          });
          setTimeout(() => {
            safeNavigate('ProfileSetup');
          }, 100);
          return;
        }
      }
    }

    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handleDone = () => {
    // Close date picker if open (iOS)
    if (showDatePicker) {
      setShowDatePicker(false);
    }

    // Validate that we have a date
    if (!dateOfBirth) return;

    // Check if user can proceed
    if (!canContinue) return;

    // Format date as YYYY-MM-DD for backend
    const formattedDateOfBirth = dateOfBirth.toISOString().split('T')[0];

    updateOnboardingData({
      dateOfBirth: formattedDateOfBirth,
      hasParentalConsent,
    });

    // For iOS users 18+, auto-navigate immediately
    if (Platform.OS === 'ios' && age !== null && age >= 18) {
      setTimeout(() => {
        safeNavigate('ProfileSetup');
      }, 100);
      return;
    }

    // Navigate to ProfileSetup
    safeNavigate('ProfileSetup');
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        (showDatePicker || age !== null) && styles.containerWithPicker,
      ]}
      keyboardShouldPersistTaps="handled">
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

      {/* Free Plan Limits Section */}
      <View style={styles.limitsSection}>
        <Text style={styles.limitsTitle}>What you can do with ELARO Free:</Text>
        <View style={styles.limitsList}>
          <View style={styles.limitItem}>
            <Text style={styles.limitIcon}>📚</Text>
            <Text style={styles.limitText}>
              <Text style={styles.limitNumber}>2 courses</Text> to organize your
              studies
            </Text>
          </View>
          <View style={styles.limitItem}>
            <Text style={styles.limitIcon}>⚡</Text>
            <Text style={styles.limitText}>
              <Text style={styles.limitNumber}>15 activities/month</Text>{' '}
              (assignments, lectures, study sessions)
            </Text>
          </View>
          <View style={styles.limitItem}>
            <Text style={styles.limitIcon}>🔔</Text>
            <Text style={styles.limitText}>
              <Text style={styles.limitNumber}>
                15 spaced repetition reminders/month
              </Text>{' '}
              for effective learning
            </Text>
          </View>
        </View>
        <Text style={styles.limitsNote}>
          Upgrade to Oddity anytime for more capacity and advanced features!
        </Text>
      </View>

      {/* Age Verification Section */}
      <View style={styles.ageSection}>
        <Text style={styles.sectionTitle}>Age Verification</Text>
        <Text style={styles.sectionSubtitle}>
          We need to verify your age to ensure a safe and appropriate
          experience.
        </Text>

        <View style={styles.dateSection}>
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}>
            <Text
              style={[
                styles.dateButtonText,
                !dateOfBirth && styles.datePlaceholderText,
              ]}>
              {formattedDate}
            </Text>
            <Text style={styles.changeText}>
              {dateOfBirth ? 'Change' : 'Set'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dateOfBirth || new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
            />
          )}
        </View>

        {/* Show age information */}
        {age !== null && (
          <View style={styles.ageContainer}>
            <Text style={styles.ageText}>Your age: {age} years old</Text>
          </View>
        )}

        {/* Error message for users under 13 */}
        {age !== null && isUnder13 && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Sorry, you must be at least 13 years old to use this service.
            </Text>
          </View>
        )}

        {/* Parental consent checkbox for users 13-17 */}
        {age !== null && needsParentalConsent && !isUnder13 && (
          <View style={styles.consentContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setHasParentalConsent(!hasParentalConsent)}>
              <View
                style={[
                  styles.checkbox,
                  hasParentalConsent && styles.checkboxChecked,
                ]}>
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
        {age !== null && age >= 18 && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              You're all set! No additional consent is required.
            </Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.buttonContainer,
          (showDatePicker || age !== null) && styles.buttonContainerWithPicker,
        ]}>
        <Button
          title="Done"
          onPress={handleDone}
          disabled={!canContinue || !dateOfBirth}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.xl, // Reduced from SPACING.xxl * 2 to eliminate unnecessary whitespace
    paddingBottom: SPACING.xxl * 2,
    backgroundColor: COLORS.background,
  },
  containerWithPicker: {
    paddingBottom: SPACING.md, // Reduce bottom padding when picker is open or age info is showing
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    // Removed paddingTop to reduce whitespace
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
    color: COLORS.textSecondary,
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
    color: COLORS.textSecondary,
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
  datePlaceholderText: {
    color: COLORS.textSecondary,
  },
  changeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  ageContainer: {
    backgroundColor: '#e3f2fd',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm, // Reduced margin to prevent pushing button down
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
    color: COLORS.textSecondary,
    marginLeft: 36,
    lineHeight: 18,
  },
  infoContainer: {
    backgroundColor: '#e8f5e9',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm, // Reduced margin to prevent pushing button down
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: '#2e7d32',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: SPACING.xxl * 2, // Push button down to sit at bottom
    marginBottom: SPACING.lg, // Add bottom margin for spacing from edge
  },
  buttonContainerWithPicker: {
    marginTop: SPACING.lg, // Reduce top margin when picker/age info is showing
  },
  limitsSection: {
    backgroundColor: '#f0f9ff',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  limitsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  limitsList: {
    marginBottom: SPACING.sm,
  },
  limitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  limitIcon: {
    fontSize: FONT_SIZES.lg,
    marginRight: SPACING.sm,
  },
  limitText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  limitNumber: {
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.primary,
  },
  limitsNote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default WelcomeScreen;
