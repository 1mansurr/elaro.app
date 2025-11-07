import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { supabase } from '@/services/supabase';
import { debounce } from '@/utils/debounce';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { Button, InfoModal, SearchableSelector } from '@/shared/components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

// Import the data files
import countriesData from '@/data/countries.json';
import universities from '@/data/universities.json';
import programsData from '@/data/programs.json';

type ScreenNavigationProp = StackNavigationProp<
  OnboardingStackParamList,
  'ProfileSetup'
>;

const ProfileSetupScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { onboardingData, updateOnboardingData } = useOnboarding();

  // Username state
  const [username, setUsername] = useState(onboardingData.username || '');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(
    onboardingData.username ? true : null,
  );
  const [isChecking, setIsChecking] = useState(false);

  // University state
  const [selectedCountry, setSelectedCountry] = useState(
    onboardingData.country || '',
  );
  const [university, setUniversity] = useState(onboardingData.university || '');
  const [program, setProgram] = useState(onboardingData.program || '');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const checkUsernameDebounced = useMemo(
    () =>
      debounce(async (newUsername: string) => {
        if (newUsername.length < 3) {
          setIsAvailable(null);
          setIsChecking(false);
          return;
        }
        setIsChecking(true);
        try {
          const { data } = await supabase.functions.invoke(
            'check-username-availability',
            {
              body: { username: newUsername },
            },
          );
          setIsAvailable(data.isAvailable);
        } catch (err) {
          console.error('Error checking username:', err);
          setIsAvailable(null);
        } finally {
          setIsChecking(false);
        }
      }, 500).debounced,
    [],
  );

  // Filter universities based on the selected country
  const universityData = useMemo(() => {
    if (!selectedCountry) return [];
    return universities
      .filter(uni => uni.country === selectedCountry)
      .map(uni => uni.name)
      .sort();
  }, [selectedCountry]);

  // Extract program names for the selector
  const programData = useMemo(() => {
    return programsData.categories
      .flatMap(category =>
        category.subfields.flatMap(subfield => subfield.programs),
      )
      .filter((program): program is string => program !== undefined)
      .sort();
  }, []);

  // Extract country names for the selector
  const countryData = useMemo(() => {
    return countriesData.countries.map(c => c.name).sort();
  }, []);

  // Check if form is valid
  const isFormValid =
    username.trim().length >= 3 &&
    isAvailable === true &&
    selectedCountry.trim().length > 0 &&
    university.trim().length > 0;

  const handleNext = () => {
    if (!isFormValid) {
      Alert.alert(
        'Please complete all required fields',
        'Username, Country, and University are required.',
      );
      return;
    }

    updateOnboardingData({
      username: username.trim(),
      country: selectedCountry,
      university: university.trim(),
      program: program.trim(),
    });

    navigation.navigate('CourseSetup');
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Set Up Your Profile</Text>
      <Text style={styles.subtitle}>
        Choose your username and tell us about your studies.
      </Text>

      {/* Username Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Username *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., john_doe"
          value={username}
          onChangeText={text => {
            const formattedText = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
            setUsername(formattedText);
            setIsChecking(true);
            checkUsernameDebounced(formattedText);
          }}
          autoCapitalize="none"
        />

        {isChecking && (
          <View style={styles.feedbackContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.feedbackText}>Checking availability...</Text>
          </View>
        )}
        {!isChecking && isAvailable === true && username.length >= 3 && (
          <Text style={[styles.feedback, styles.success]}>
            ✓ Username is available!
          </Text>
        )}
        {!isChecking && isAvailable === false && (
          <Text style={[styles.feedback, styles.error]}>
            ✗ Username is already taken.
          </Text>
        )}
        {!isChecking && username.length > 0 && username.length < 3 && (
          <Text style={[styles.feedback, styles.error]}>
            Username must be at least 3 characters.
          </Text>
        )}
      </View>

      {/* University Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Your Studies</Text>
        <Text style={styles.sectionHint}>
          This helps us personalize your experience.
        </Text>

        <SearchableSelector
          label="Country *"
          data={countryData}
          selectedValue={selectedCountry}
          onValueChange={setSelectedCountry}
          placeholder="Select your country..."
          searchPlaceholder="Search for your country"
        />

        {/* Only show the University selector if a country has been selected */}
        {selectedCountry && (
          <SearchableSelector
            label="University *"
            data={universityData}
            selectedValue={university}
            onValueChange={setUniversity}
            placeholder="Select or type your university..."
            searchPlaceholder="Search for your university"
          />
        )}

        <SearchableSelector
          label="Program of Study (Optional)"
          data={programData}
          selectedValue={program}
          onValueChange={setProgram}
          placeholder="Select or type your program..."
          searchPlaceholder="Search for your program"
        />

        <TouchableOpacity onPress={() => setIsModalVisible(true)}>
          <Text style={styles.linkText}>Why do we need this?</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Back" onPress={handleBack} variant="outline" />
        <Button title="Continue" onPress={handleNext} disabled={!isFormValid} />
      </View>

      <InfoModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Why We Ask for Your Info"
        message="We're building special tools and integrations for specific universities and programs. Your username helps you connect with classmates and build your academic identity on ELARO!"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    color: COLORS.gray,
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    marginBottom: SPACING.xs,
    color: COLORS.text,
  },
  sectionHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    borderRadius: 12,
    fontSize: FONT_SIZES.md,
    backgroundColor: COLORS.background,
    color: COLORS.text,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  feedbackText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
  },
  feedback: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
  },
  success: {
    color: '#2e7d32',
  },
  error: {
    color: '#c62828',
  },
  linkText: {
    marginTop: SPACING.sm,
    textAlign: 'center',
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
});

export default ProfileSetupScreen;
