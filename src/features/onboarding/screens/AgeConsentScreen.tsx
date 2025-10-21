import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/shared/components';

type ScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'AgeConsent'>;

const AgeConsentScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { onboardingData, updateOnboardingData } = useOnboarding();

  const [dateOfBirth, setDateOfBirth] = useState<Date>(
    onboardingData.dateOfBirth ? new Date(onboardingData.dateOfBirth) : new Date(2000, 0, 1)
  );
  const [hasParentalConsent, setHasParentalConsent] = useState(onboardingData.hasParentalConsent);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
    
    navigation.navigate('OnboardingUsername');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Age Verification</Text>
      <Text style={styles.subtitle}>
        We need to verify your age to ensure a safe and appropriate experience for all users.
      </Text>

      <View style={styles.section}>
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
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1a1a1a',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  changeText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  doneButton: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ageContainer: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  ageText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1976d2',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    fontSize: 15,
    color: '#c62828',
    textAlign: 'center',
    lineHeight: 22,
  },
  consentContainer: {
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  consentText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
    lineHeight: 22,
  },
  consentSubtext: {
    fontSize: 14,
    color: '#666',
    marginLeft: 36,
    lineHeight: 20,
  },
  infoContainer: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 15,
    color: '#2e7d32',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    marginTop: 20,
  },
});

export default AgeConsentScreen;

