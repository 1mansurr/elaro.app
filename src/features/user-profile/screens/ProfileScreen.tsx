import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { SearchableSelector } from '@/shared/components';
import { RootStackParamList } from '@/types/navigation';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { invokeEdgeFunctionWithAuth } from '@/utils/invokeEdgeFunction';
import { sanitizeProfileData } from '@/utils/profileDataValidator';
import { COLORS } from '@/constants/theme';

// Import the data files
import countriesData from '@/data/countries.json';

type ScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

const ProfileScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { user, refreshUser, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

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

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    setIsInitializing(false);

    // Use sanitizeProfileData to ensure clean, validated data
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

      // Refresh user data in AuthContext
      await refreshUser();

      // Also invalidate React Query cache if any components use React Query for user data
      await queryClient.invalidateQueries({ queryKey: ['user'] });

      Alert.alert('Success', 'Your profile has been updated.');
      navigation.goBack();
    } catch (err) {
      const errorTitle = getErrorTitle(err);
      const errorMessage = mapErrorCodeToMessage(err);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while initializing or auth is loading
  if (isInitializing || authLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>

      <Text style={styles.label}>First Name</Text>
      <TextInput
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Enter your first name"
      />

      <Text style={styles.label}>Last Name</Text>
      <TextInput
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
        placeholder="Enter your last name"
      />

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        editable={false}
        placeholder="Username"
      />
      {/* Username is not editable for now to avoid complexity with uniqueness checks */}

      <SearchableSelector
        label="Country"
        data={countryData}
        selectedValue={country}
        onValueChange={setCountry}
        placeholder="Select your country..."
        searchPlaceholder="Search for your country"
      />

      <Text style={styles.label}>University</Text>
      <TextInput
        style={styles.input}
        value={university}
        onChangeText={setUniversity}
        placeholder="Enter your university"
      />

      <Text style={styles.label}>Program of Study</Text>
      <TextInput
        style={styles.input}
        value={program}
        onChangeText={setProgram}
        placeholder="Enter your program of study"
      />

      <Button
        title={isLoading ? 'Saving...' : 'Save Changes'}
        onPress={handleSaveChanges}
        disabled={isLoading}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 16, marginTop: 15, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default ProfileScreen;
