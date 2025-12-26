import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  SearchableSelector,
  ProfileFieldRow,
  ProfileFormInput,
} from '@/shared/components';
import { RootStackParamList } from '@/types/navigation';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { invokeEdgeFunctionWithAuth } from '@/utils/invokeEdgeFunction';
import { sanitizeProfileData } from '@/utils/profileDataValidator';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import countriesData from '@/data/countries.json';

type ScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

const ProfileScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { user, refreshUser, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [isEditMode, setIsEditMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [university, setUniversity] = useState('');
  const [program, setProgram] = useState('');
  const [country, setCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Extract country names for the selector
  const countryData = useMemo(() => {
    return countriesData.countries.map(c => c.name).sort();
  }, []);

  // Format member since date
  const memberSinceYear = useMemo(() => {
    if (!user?.created_at) return null;
    try {
      const date = new Date(user.created_at);
      return date.getFullYear();
    } catch {
      return null;
    }
  }, [user?.created_at]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    setIsInitializing(false);

    const sanitizedData = sanitizeProfileData(user);

    setFirstName(sanitizedData.firstName);
    setLastName(sanitizedData.lastName);
    setUsername(sanitizedData.username);
    setUniversity(sanitizedData.university);
    setProgram(sanitizedData.program);
    setCountry(sanitizedData.country);
  }, [user, authLoading]);

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      const { error } = await invokeEdgeFunctionWithAuth(
        'update-user-profile',
        {
          body: {
            firstName,
            lastName,
            university,
            program,
            country,
          },
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ['user'] });

      setIsEditMode(false);
      Alert.alert('Success', 'Your profile has been updated.');
    } catch (err) {
      const errorTitle = getErrorTitle(err);
      const errorMessage = mapErrorCodeToMessage(err);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    const sanitizedData = sanitizeProfileData(user);
    setFirstName(sanitizedData.firstName);
    setLastName(sanitizedData.lastName);
    setUsername(sanitizedData.username);
    setUniversity(sanitizedData.university);
    setProgram(sanitizedData.program);
    setCountry(sanitizedData.country);
    setIsEditMode(false);
    navigation.goBack(); // Navigate back instead of just exiting edit mode
  };

  const fullName = useMemo(() => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return firstName || lastName || user?.name || 'User';
  }, [firstName, lastName, user?.name]);

  const displayUsername = useMemo(() => {
    return username ? `@${username}` : '';
  }, [username]);

  if (isInitializing || authLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.background, paddingTop: insets.top },
        ]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}>
      {/* Header */}
      <View style={styles.header}>
        <BlurView
          intensity={80}
          tint={theme.isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
          {isEditMode ? (
            <>
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.backButton}
                activeOpacity={0.7}>
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={theme.isDark ? '#FFFFFF' : '#111318'}
                />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                Edit Profile
              </Text>
              {/* Empty space to balance the back button */}
              <View style={styles.backButton} />
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                activeOpacity={0.7}>
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={theme.isDark ? '#FFFFFF' : '#111318'}
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.headerTitle,
                  { color: theme.isDark ? '#FFFFFF' : '#111318' },
                ]}>
                Profile
              </Text>
              <TouchableOpacity
                onPress={() => setIsEditMode(true)}
                style={styles.editButton}
                activeOpacity={0.7}>
                <Ionicons
                  name="create-outline"
                  size={24}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Save button positioned below header (only in edit mode) */}
      {isEditMode && (
        <View
          style={[
            styles.saveButtonContainer,
            { backgroundColor: theme.background },
          ]}>
          <TouchableOpacity
            onPress={handleSaveChanges}
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            disabled={isLoading}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.saveButtonText,
                { color: COLORS.primary },
                isLoading && styles.saveButtonTextDisabled,
              ]}>
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {isEditMode ? (
          // Edit Mode
          <View style={styles.editContainer}>
            <ProfileFormInput
              label="Username"
              value={username || ''}
              onChangeText={setUsername}
              placeholder="@username"
              helperText="Changeable every 14 days"
              autoCapitalize="none"
            />

            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <ProfileFormInput
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First Name"
                />
              </View>
              <View style={styles.nameField}>
                <ProfileFormInput
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last Name"
                />
              </View>
            </View>

            <View style={styles.countryContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Country</Text>
              <SearchableSelector
                label="Country"
                data={countryData}
                selectedValue={country || ''}
                onValueChange={setCountry}
                placeholder="Select your country..."
                searchPlaceholder="Search for your country"
                id="country-selector"
              />
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: theme.isDark ? '#374151' : '#DBDFE6' },
              ]}
            />

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Academic Details
            </Text>

            <ProfileFormInput
              label="University"
              value={university}
              onChangeText={setUniversity}
              placeholder="e.g. Oxford University"
              icon="school"
            />

            <ProfileFormInput
              label="Program of Study"
              value={program}
              onChangeText={setProgram}
              placeholder="e.g. Computer Science"
              icon="book"
            />
          </View>
        ) : (
          // View Mode
          <>
            <View style={styles.profileHeader}>
              <Text style={[styles.profileName, { color: theme.text }]}>
                {fullName}
              </Text>
              {displayUsername && (
                <Text
                  style={[styles.profileUsername, { color: COLORS.primary }]}>
                  {displayUsername}
                </Text>
              )}
              {memberSinceYear && (
                <Text
                  style={[
                    styles.memberSince,
                    { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
                  ]}>
                  Member since {memberSinceYear}
                </Text>
              )}
            </View>

            <View
              style={[
                styles.detailsCard,
                {
                  backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: theme.isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}>
              {country && (
                <ProfileFieldRow
                  label="Country"
                  value={country}
                  icon="globe-outline"
                  iconColor={theme.isDark ? '#60A5FA' : '#2563EB'}
                  iconBgColor={
                    theme.isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF'
                  }
                  showBorder
                />
              )}
              {university && (
                <ProfileFieldRow
                  label="University"
                  value={university}
                  icon="school-outline"
                  iconColor={theme.isDark ? '#A78BFA' : '#9333EA'}
                  iconBgColor={
                    theme.isDark ? 'rgba(147, 51, 234, 0.2)' : '#F3E8FF'
                  }
                  showBorder
                />
              )}
              {program && (
                <ProfileFieldRow
                  label="Program of Study"
                  value={program}
                  icon="book-outline"
                  iconColor={theme.isDark ? '#34D399' : '#059669'}
                  iconBgColor={
                    theme.isDark ? 'rgba(5, 150, 105, 0.2)' : '#D1FAE5'
                  }
                  showBorder={false}
                />
              )}
            </View>

            <View style={styles.footerNote}>
              <Text
                style={[
                  styles.footerText,
                  { color: theme.isDark ? '#6B7280' : '#9CA3AF' },
                ]}>
                Review your academic details carefully. To update your
                university or program, please contact student support or use the
                edit button.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'relative',
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: -0.015,
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    minWidth: 60,
    paddingVertical: SPACING.xs,
  },
  headerButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  headerButtonPrimary: {
    fontWeight: FONT_WEIGHTS.bold,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  saveButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  saveButtonTextDisabled: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  // View Mode Styles
  profileHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    gap: 4,
  },
  profileName: {
    fontSize: 30,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: -0.01,
    textAlign: 'center',
  },
  profileUsername: {
    fontSize: 18,
    fontWeight: FONT_WEIGHTS.medium,
    textAlign: 'center',
    marginTop: 4,
  },
  memberSince: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.normal,
    textAlign: 'center',
    marginTop: 8,
  },
  detailsCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  footerNote: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  // Edit Mode Styles
  editContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    gap: 24,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 16,
  },
  nameField: {
    flex: 1,
  },
  countryContainer: {
    gap: 8,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    marginVertical: 8,
    marginHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: FONT_WEIGHTS.bold,
    marginLeft: 4,
  },
});

export default ProfileScreen;
