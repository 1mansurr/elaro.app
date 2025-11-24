import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { debounce } from '@/utils/debounce';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { Button, InfoModal, SearchableSelector } from '@/shared/components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { isReservedUsername } from '@/constants/reservedUsernames';

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
  const { session } = useAuth();

  // Username state
  const [username, setUsername] = useState(onboardingData.username || '');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(
    onboardingData.username ? true : null,
  );
  const [isChecking, setIsChecking] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [lastCheckedUsername, setLastCheckedUsername] = useState<string | null>(
    onboardingData.username || null,
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  // Validation functions
  const validateUsernameLength = (username: string): { valid: boolean; error?: string } => {
    if (username.length < 4) {
      return { valid: false, error: 'Username must be at least 4 characters.' };
    }
    if (username.length > 20) {
      return { valid: false, error: 'Username must be 20 characters or less.' };
    }
    return { valid: true };
  };

  const validateUsernameCharacters = (username: string): { valid: boolean; error?: string } => {
    const regex = /^[a-zA-Z0-9_.]+$/;
    if (!regex.test(username)) {
      return { valid: false, error: 'Username can only contain letters, numbers, dots, and underscores.' };
    }
    return { valid: true };
  };

  const validateUsernameFormat = (username: string): { valid: boolean; error?: string } => {
    // Check start/end
    if (/^[._]/.test(username)) {
      return { valid: false, error: 'Username cannot start with a dot or underscore.' };
    }
    if (/[._]$/.test(username)) {
      return { valid: false, error: 'Username cannot end with a dot or underscore.' };
    }
    // Check consecutive
    if (/[._]{2,}/.test(username)) {
      return { valid: false, error: 'Username cannot have consecutive dots or underscores.' };
    }
    return { valid: true };
  };

  const validateReservedUsername = (username: string): { valid: boolean; error?: string } => {
    if (isReservedUsername(username)) {
      return { valid: false, error: 'This username is not available.' };
    }
    return { valid: true };
  };

  // University state
  const [selectedCountry, setSelectedCountry] = useState(
    onboardingData.country || '',
  );
  const [university, setUniversity] = useState(onboardingData.university || '');
  const [program, setProgram] = useState(onboardingData.program || '');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeSelectorId, setActiveSelectorId] = useState<string | null>(null);

  const { debounced: checkUsernameDebounced, cancel: cancelUsernameDebounce } =
    useMemo(() => {
      const { debounced, cancel } = debounce(async (newUsername: string) => {
        setIsChecking(true);
        if (newUsername.length < 4) {
          setIsAvailable(null);
          setUsernameError(null);
          setIsChecking(false);
          abortControllerRef.current?.abort();
          abortControllerRef.current = null;
          return;
        }
        if (lastCheckedUsername === newUsername) {
          setIsChecking(false);
          return;
        }
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setUsernameError(null);

        // Ensure user is authenticated before checking username
        if (!session) {
          setUsernameError('Please sign in to check username availability.');
          setIsAvailable(null);
          setIsChecking(false);
          abortControllerRef.current?.abort();
          abortControllerRef.current = null;
          return;
        }

        const timeoutId = setTimeout(() => controller.abort(), 10_000);

        try {
          // Get fresh access token from Supabase session (not from context which may be stale)
          // This ensures we have the latest valid token and the Edge Function receives the JWT for RLS context
          const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
          
          // Debug logging to verify session exists
          console.log('🔍 Session Debug (check-username):', {
            hasSession: !!currentSession,
            hasError: !!sessionError,
            userId: currentSession?.user?.id,
            tokenLength: currentSession?.access_token?.length,
            tokenPreview: currentSession?.access_token?.substring(0, 20) + '...',
            expiresAt: currentSession?.expires_at,
            expiresIn: currentSession?.expires_in,
            username: newUsername,
          });
          
          if (sessionError || !currentSession) {
            console.error('❌ Error getting session for username check:', sessionError);
            setUsernameError('Please sign in to check username availability.');
            setIsAvailable(null);
            setIsChecking(false);
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
            return;
          }

          const accessToken = currentSession.access_token;
          if (!accessToken) {
            console.error('❌ No access token available for username check');
            setUsernameError('Please sign in to check username availability.');
            setIsAvailable(null);
            setIsChecking(false);
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
            return;
          }

          // Debug logging to see the actual request
          console.log('📤 Calling check-username-availability with token:', accessToken.substring(0, 30) + '...');

          const { data, error } = await supabase.functions.invoke(
            'check-username-availability',
            {
              body: { username: newUsername },
              signal: controller.signal,
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          if (error) {
            console.error('❌ Error from check-username-availability:', error);
            throw error;
          }

          if (data && typeof data.available === 'boolean') {
            if (data.available) {
              setIsAvailable(true);
              setUsernameError(null);
            } else {
              setIsAvailable(false);
              setUsernameError(data.message || 'Username is already taken.');
            }
            setLastCheckedUsername(newUsername);
          } else {
            setIsAvailable(null);
            setUsernameError('Unexpected response. Please try again.');
          }
        } catch (err: unknown) {
          console.error('Error checking username:', err);

          if (err?.name === 'AbortError') {
            setUsernameError('Request timed out. Please try again.');
          } else {
            setUsernameError("Couldn't check username. Please try again.");
          }
          setIsAvailable(null);
        } finally {
          clearTimeout(timeoutId);
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
          setIsChecking(false);
        }
      }, 250);
      return { debounced, cancel };
    }, [lastCheckedUsername, session]);

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
    username.trim().length >= 4 &&
    isAvailable === true &&
    selectedCountry.trim().length > 0 &&
    university.trim().length > 0 &&
    program.trim().length > 0;

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

  const handleSelectorOpen = (id: string) => {
    // Close previous selector if different
    if (activeSelectorId && activeSelectorId !== id) {
      setActiveSelectorId(null);
      Keyboard.dismiss();
    }
    // Set new active selector
    setActiveSelectorId(id);
  };

  const handleOutsidePress = () => {
    setActiveSelectorId(null);
    Keyboard.dismiss();
  };

  useEffect(() => {
    return () => {
      cancelUsernameDebounce();
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [cancelUsernameDebounce]);

  return (
    <LinearGradient
      colors={['#f8f9ff', '#ffffff', '#fff8f9']}
      style={styles.gradient}>
      <TouchableWithoutFeedback onPress={handleOutsidePress}>
      <ScrollView
        contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Set Up Your Profile</Text>
          <Text style={styles.subtitle}>
            Choose your username and tell us about your studies.
          </Text>
        </View>

        <View style={styles.card}>
          <LinearGradient
            colors={['#ffffff', '#fafbff']}
            style={styles.cardGradient}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>👤 Username</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="e.g., john_doe"
              value={username}
              onChangeText={text => {
                // Allow dots and underscores, preserve case
                const formattedText = text.replace(/[^a-zA-Z0-9_.]/g, '');
                setUsername(formattedText);
                
                // Clear previous errors
                setUsernameError(null);
                setIsAvailable(null);

                // Validate in order: Length → Characters → Format → Reserved Word
                if (formattedText.length === 0) {
                  return; // Don't validate empty input
                }

                // Length validation
                const lengthValidation = validateUsernameLength(formattedText);
                if (!lengthValidation.valid) {
                  setUsernameError(lengthValidation.error || null);
                  setIsAvailable(false);
                  return;
                }

                // Character validation
                const charValidation = validateUsernameCharacters(formattedText);
                if (!charValidation.valid) {
                  setUsernameError(charValidation.error || null);
                  setIsAvailable(false);
                  return;
                }

                // Format validation
                const formatValidation = validateUsernameFormat(formattedText);
                if (!formatValidation.valid) {
                  setUsernameError(formatValidation.error || null);
                  setIsAvailable(false);
                  return;
                }

                // Reserved word validation
                const reservedValidation = validateReservedUsername(formattedText);
                if (!reservedValidation.valid) {
                  setUsernameError(reservedValidation.error || null);
                  setIsAvailable(false);
                  return;
                }

                // All validations passed, check availability via API
                checkUsernameDebounced(formattedText);
              }}
              autoCapitalize="none"
              placeholderTextColor={COLORS.textSecondary}
            />

            {isChecking && (
              <View style={styles.feedbackContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.feedbackText}>
                  Checking availability...
                </Text>
              </View>
            )}
            {!isChecking && username.length > 0 && username.length < 4 && (
              <Text style={[styles.feedback, styles.error]}>
                Username must be at least 4 characters.
              </Text>
            )}
            {!isChecking && username.length >= 4 && isAvailable === true && (
              <Text style={[styles.feedback, styles.success]}>
                ✓ Username is available!
              </Text>
            )}
            {!isChecking && username.length >= 4 && usernameError && (
              <Text
                style={[
                  styles.feedback,
                  isAvailable === false ? styles.error : styles.neutral,
                ]}>
                {isAvailable === false ? `✗ ${usernameError}` : usernameError}
              </Text>
            )}
          </LinearGradient>
        </View>

        <View style={styles.card}>
          <LinearGradient
            colors={['#ffffff', '#fffbfa']}
            style={styles.cardGradient}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>🎓 Your Studies</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            </View>
            <Text style={styles.cardHint}>
              Tell us where you study so we can personalize your experience.
            </Text>

            <View style={styles.fieldGroup}>
              <SearchableSelector
                id="country"
                label="Country *"
                data={countryData}
                selectedValue={selectedCountry}
                onValueChange={setSelectedCountry}
                placeholder="Select your country..."
                searchPlaceholder="Search for your country"
                showOther={false}
                isActive={activeSelectorId === 'country'}
                onOpen={handleSelectorOpen}
              />
            </View>

            {selectedCountry && (
              <View style={styles.fieldGroup}>
                <SearchableSelector
                  id="university"
                  label="University *"
                  data={universityData}
                  selectedValue={university}
                  onValueChange={setUniversity}
                  placeholder="Select or type your university..."
                  searchPlaceholder="Search for your university"
                  showOther={true}
                  tooltipText="Enter your university manually"
                  isActive={activeSelectorId === 'university'}
                  onOpen={handleSelectorOpen}
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <SearchableSelector
                id="program"
                label="Program of Study *"
                data={programData}
                selectedValue={program}
                onValueChange={setProgram}
                placeholder="Select or type your program..."
                searchPlaceholder="Search for your program"
                showOther={true}
                tooltipText="Enter your course manually"
                isActive={activeSelectorId === 'program'}
                onOpen={handleSelectorOpen}
              />
            </View>

            <TouchableOpacity
              onPress={() => setIsModalVisible(true)}
              style={styles.linkContainer}>
              <Text style={styles.linkText}>Why do we need this?</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>
      </TouchableWithoutFeedback>

      <View style={styles.footer}>
        <Button title="Back" onPress={handleBack} variant="outline" />
        <Button title="Continue" onPress={handleNext} disabled={!isFormValid} />
      </View>

      <InfoModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Why We Ask for Your Info"
        message="We're building special tools and integrations for specific universities and programs. Your username helps you connect with classmates and build your academic identity on ELARO!"
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
  card: {
    marginBottom: SPACING.xl,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    padding: SPACING.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg + 1,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  requiredBadge: {
    backgroundColor: '#fff0f0',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe0e0',
  },
  requiredText: {
    fontSize: FONT_SIZES.xs,
    color: '#c62828',
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  cardHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  fieldGroup: {
    marginBottom: SPACING.md,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e8eaf6',
    padding: SPACING.md + 2,
    borderRadius: 14,
    fontSize: FONT_SIZES.md,
    backgroundColor: '#fafbff',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  feedbackText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  feedback: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  success: {
    color: '#2e7d32',
  },
  error: {
    color: '#c62828',
  },
  neutral: {
    color: COLORS.textSecondary,
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  linkText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    textDecorationLine: 'underline',
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
