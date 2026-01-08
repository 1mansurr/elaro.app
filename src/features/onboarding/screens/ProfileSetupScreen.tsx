import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { Button, InfoModal } from '@/shared/components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { useUsernameAvailability } from '@/hooks/useUsernameAvailability';
import { useProfileSetupData } from '@/features/onboarding/hooks/useProfileSetupData';
import { UsernameInputCard } from '@/features/onboarding/components/UsernameInputCard';
import { StudiesSection } from '@/features/onboarding/components/StudiesSection';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';

type ScreenNavigationProp = StackNavigationProp<
  OnboardingStackParamList,
  'ProfileSetup'
>;

const ProfileSetupScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const { refreshUser } = useAuth();

  // Username management via custom hook
  const {
    username,
    setUsername,
    isAvailable,
    isChecking,
    usernameError,
    checkUsername,
    clearAvailabilityState,
  } = useUsernameAvailability(onboardingData.username);

  // Studies state
  const [selectedCountry, setSelectedCountry] = useState(
    onboardingData.country || '',
  );
  const [university, setUniversity] = useState(onboardingData.university || '');
  const [program, setProgram] = useState(onboardingData.program || '');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeSelectorId, setActiveSelectorId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const studiesSectionRef = useRef<View>(null);
  const [studiesSectionY, setStudiesSectionY] = useState(0);

  // Onboarding completion state
  const [isLoading, setIsLoading] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // Profile setup data via custom hook
  const { countryData, universityData, programData } =
    useProfileSetupData(selectedCountry);

  // Check if form is valid
  const isFormValid =
    username.trim().length >= 4 &&
    isAvailable === true &&
    selectedCountry.trim().length > 0 &&
    university.trim().length > 0 &&
    program.trim().length > 0;

  const handleNext = async () => {
    if (!isFormValid) {
      Alert.alert(
        'Please complete all required fields',
        'Username, Country, and University are required.',
      );
      return;
    }

    // Validate required fields before sending
    if (!username || username.trim().length < 4) {
      Alert.alert(
        'Missing Information',
        'Please complete your profile setup. Username is required and must be at least 4 characters.',
      );
      return;
    }

    if (!onboardingData.dateOfBirth) {
      Alert.alert(
        'Missing Information',
        'Please complete your profile setup. Date of birth is required.',
      );
      return;
    }

    setIsLoading(true);

    try {
      // Update onboarding data with current form values
      updateOnboardingData({
        username: username.trim(),
        country: selectedCountry,
        university: university.trim(),
        program: program.trim(),
      });

      // Prepare the request body for complete-onboarding
      // Filter out empty strings for optional fields - convert to undefined
      const body = {
        username: username.trim(),
        country:
          selectedCountry && selectedCountry.trim()
            ? selectedCountry.trim()
            : undefined,
        university:
          university && university.trim() ? university.trim() : undefined,
        program: program && program.trim() ? program.trim() : undefined,
        courses: [], // No courses during onboarding
        dateOfBirth: onboardingData.dateOfBirth,
        hasParentalConsent: onboardingData.hasParentalConsent || false,
        marketingOptIn: marketingOptIn || false,
      };

      // Log the request body for debugging (excluding sensitive data)
      console.log('Onboarding completion request:', {
        username: body.username,
        hasCountry: !!body.country,
        hasUniversity: !!body.university,
        hasProgram: !!body.program,
        coursesCount: body.courses.length,
        hasDateOfBirth: !!body.dateOfBirth,
      });

      // Get fresh access token to ensure it's valid
      const { getFreshAccessToken } =
        await import('@/utils/getFreshAccessToken');
      const accessToken = await getFreshAccessToken();

      const { error, data } = await supabase.functions.invoke(
        'complete-onboarding',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body,
        },
      );

      if (error) {
        console.error('Onboarding completion error details:', {
          error,
          message: error.message,
          code: error.code,
          context: error.context,
        });
        throw error;
      }

      console.log('Onboarding completed successfully:', data);

      // Refresh user profile to get updated onboarding_completed status
      // Wait a moment for backend to process the update
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshUser();

      Alert.alert(
        'Setup Complete!',
        'Your profile has been saved successfully. You can add courses anytime from the Account page.',
      );

      // The AuthenticatedNavigator will automatically show Main when onboarding_completed is true
      // No need to manually navigate - refreshUser() will trigger a re-render
      // and AuthenticatedNavigator will switch to the main app screens
    } catch (error: unknown) {
      console.error('Onboarding completion error:', error);
      const errorTitle = getErrorTitle(error);
      const errorMessage = mapErrorCodeToMessage(error);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    // Save current state before going back
    updateOnboardingData({
      username: username.trim(),
      country: selectedCountry,
      university,
      program,
    });
    navigation.navigate('Welcome');
  };

  const handleSelectorOpen = (id: string) => {
    // Close previous selector if different
    if (activeSelectorId && activeSelectorId !== id) {
      setActiveSelectorId(null);
      // Don't dismiss keyboard when switching selectors - keep it open
    }
    // Set new active selector
    setActiveSelectorId(id);
  };

  const handleCountryComplete = () => {
    // Auto-focus university selector when country is selected
    // Don't check selectedCountry here - it might not be updated yet
    // The onValueChange callback will update it, so just focus the next selector
    setTimeout(() => {
      setActiveSelectorId('university');
      handleSelectorFocusScroll('university');
      // The SearchableSelector's useEffect will handle focusing when isActive becomes true
    }, 200); // Increased timeout to ensure state updates are processed
  };

  const handleUniversityComplete = () => {
    // Auto-focus program selector when university is selected
    // Don't check university here - it might not be updated yet
    setTimeout(() => {
      setActiveSelectorId('program');
      handleSelectorFocusScroll('program');
      // The SearchableSelector's useEffect will handle focusing when isActive becomes true
    }, 200); // Increased timeout to ensure state updates are processed
  };

  const handleOutsidePress = () => {
    // Close selectors but keep keyboard open so user can continue typing
    setActiveSelectorId(null);
    // Don't dismiss keyboard - let user keep typing
  };

  const handleUsernameChange = (newUsername: string) => {
    // Clear availability state when username changes
    clearAvailabilityState();
    setUsername(newUsername);
  };

  const handleUsernameValidate = (usernameToCheck: string) => {
    // Trigger API availability check
    checkUsername(usernameToCheck);
  };

  const handleSelectorFocusScroll = (selectorId: string) => {
    // Scroll to show the selector and first 2 dropdown options
    if (!scrollViewRef.current) return;

    // Calculate approximate positions for each selector within the studies section
    // Country is first, University is second (if country selected), Program is third
    let selectorOffset = 0;

    if (selectorId === 'country') {
      selectorOffset = 120; // Approximate: label + spacing + input
    } else if (selectorId === 'university') {
      selectorOffset = 220; // Country + spacing + University
    } else if (selectorId === 'program') {
      selectorOffset = selectedCountry ? 320 : 220; // All three or just two
    }

    // Scroll to show selector with space for first 2 dropdown options (~120px)
    const targetScrollY = studiesSectionY + selectorOffset - 120;

    scrollViewRef.current.scrollTo({
      y: Math.max(0, targetScrollY),
      animated: true,
    });
  };

  return (
    <LinearGradient
      colors={['#f8f9ff', '#ffffff', '#fff8f9']}
      style={styles.gradient}>
      <TouchableWithoutFeedback onPress={handleOutsidePress}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Set Up Your Profile</Text>
            <Text style={styles.subtitle}>
              Choose your username and tell us about your studies.
            </Text>
          </View>

          <UsernameInputCard
            username={username}
            onUsernameChange={handleUsernameChange}
            isAvailable={isAvailable}
            isChecking={isChecking}
            usernameError={usernameError}
            onValidate={handleUsernameValidate}
          />

          <View
            ref={studiesSectionRef}
            onLayout={event => {
              const { y } = event.nativeEvent.layout;
              setStudiesSectionY(y);
            }}>
            <StudiesSection
              selectedCountry={selectedCountry}
              university={university}
              program={program}
              countryData={countryData}
              universityData={universityData}
              programData={programData}
              onCountryChange={setSelectedCountry}
              onUniversityChange={setUniversity}
              onProgramChange={setProgram}
              activeSelectorId={activeSelectorId}
              onSelectorOpen={handleSelectorOpen}
              onInfoPress={() => setIsModalVisible(true)}
              onSelectorFocusScroll={handleSelectorFocusScroll}
              onCountryComplete={handleCountryComplete}
              onUniversityComplete={handleUniversityComplete}
            />
          </View>

          {/* Marketing Opt-In Section */}
          <View style={styles.marketingSection}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setMarketingOptIn(!marketingOptIn)}
              activeOpacity={0.7}>
              <View
                style={[
                  styles.checkbox,
                  marketingOptIn && styles.checkboxChecked,
                ]}>
                {marketingOptIn && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.checkboxTextContainer}>
                <Text style={styles.checkboxLabel}>
                  Yes, send me helpful tips, new feature announcements, and
                  special offers from ELARO.
                </Text>
                <Text style={styles.checkboxSubtext}>
                  You can change this anytime in your Settings.
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      <View style={styles.footer}>
        <Button title="Back" onPress={handleBack} variant="outline" />
        <Button
          title="Finish Setup"
          onPress={handleNext}
          disabled={!isFormValid || isLoading}
          loading={isLoading}
        />
      </View>

      <InfoModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Why We Ask for Your Info"
        message="We will build tools and integrations for specific universities and programs. So we need to know which tools to show you."
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl + 200, // Add 200px bottom padding for keyboard
  },
  header: {
    marginBottom: SPACING.xl * 1.5,
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.xxl + 2,
    fontWeight: FONT_WEIGHTS.bold as any,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    color: COLORS.textSecondary,
    lineHeight: 24,
    paddingHorizontal: SPACING.md,
  },
  marketingSection: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold as any,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  checkboxSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
});

export default ProfileSetupScreen;
